-- A stand-in for the parts of Aseprite's Lua API that tools/aseprite/extension/nayosbeat.lua uses,
-- so scenario.lua can run it outside Aseprite (`npm run aseprite:check`). It checks the
-- extension's own logic, not Aseprite's behavior. Images are indexed only; PNGs are written with
-- stored (uncompressed) deflate blocks.

ALERTS = {}
COMMANDS = {}
DIALOG_DATA = {}

-- JSON ---------------------------------------------------------------------------------------
local function decodeJson(text)
  local pos = 1
  local function skip() pos = text:find("[^ \t\r\n]", pos) or #text + 1 end
  local value
  local function str()
    local out = {}
    pos = pos + 1
    while true do
      local c = text:sub(pos, pos)
      if c == '"' then pos = pos + 1; break end
      if c == "\\" then
        local n = text:sub(pos + 1, pos + 1)
        local map = { n = "\n", t = "\t", r = "\r", b = "\b", f = "\f", ['"'] = '"', ["\\"] = "\\", ["/"] = "/" }
        if n == "u" then
          local code = tonumber(text:sub(pos + 2, pos + 5), 16)
          table.insert(out, utf8.char(code)); pos = pos + 6
        else
          table.insert(out, map[n]); pos = pos + 2
        end
      else
        table.insert(out, c); pos = pos + 1
      end
    end
    return table.concat(out)
  end
  function value()
    skip()
    local c = text:sub(pos, pos)
    if c == "{" then
      local obj = {}
      pos = pos + 1; skip()
      if text:sub(pos, pos) == "}" then pos = pos + 1; return obj end
      while true do
        skip(); local key = str(); skip()
        pos = pos + 1 -- :
        obj[key] = value(); skip()
        local d = text:sub(pos, pos); pos = pos + 1
        if d == "}" then return obj end
      end
    elseif c == "[" then
      local arr = {}
      pos = pos + 1; skip()
      if text:sub(pos, pos) == "]" then pos = pos + 1; return arr end
      while true do
        arr[#arr + 1] = value(); skip()
        local d = text:sub(pos, pos); pos = pos + 1
        if d == "]" then return arr end
      end
    elseif c == '"' then return str()
    elseif text:sub(pos, pos + 3) == "true" then pos = pos + 4; return true
    elseif text:sub(pos, pos + 4) == "false" then pos = pos + 5; return false
    elseif text:sub(pos, pos + 3) == "null" then pos = pos + 4; return nil
    else
      local num = text:match("^-?%d+%.?%d*[eE]?[-+]?%d*", pos)
      pos = pos + #num
      return math.tointeger(tonumber(num)) or tonumber(num)
    end
  end
  return value()
end
json = { decode = decodeJson }

-- PNG (stored deflate) -------------------------------------------------------------------------
local CRC = {}
for n = 0, 255 do
  local c = n
  for _ = 1, 8 do c = (c & 1) ~= 0 and (0xedb88320 ~ (c >> 1)) or (c >> 1) end
  CRC[n] = c
end
local function crc32(s)
  local c = 0xffffffff
  for i = 1, #s do c = CRC[(c ~ s:byte(i)) & 0xff] ~ (c >> 8) end
  return c ~ 0xffffffff
end
local function adler32(s)
  local a, b = 1, 0
  for i = 1, #s do a = (a + s:byte(i)) % 65521; b = (b + a) % 65521 end
  return (b << 16) | a
end
local function chunk(kind, data)
  return string.pack(">I4", #data) .. kind .. data .. string.pack(">I4", crc32(kind .. data))
end
local function writePng(path, width, height, data, palette)
  local rows = {}
  for y = 0, height - 1 do
    local row = { 0 }
    for x = 0, width - 1 do row[#row + 1] = data[y * width + x + 1] end
    rows[#rows + 1] = string.char(table.unpack(row))
  end
  local raw = table.concat(rows)
  local blocks = {}
  local i = 1
  repeat
    local part = raw:sub(i, i + 65534)
    i = i + #part
    blocks[#blocks + 1] = string.char(i > #raw and 1 or 0) .. string.pack("<I2<I2", #part, (~#part) & 0xffff) .. part
  until i > #raw
  local zlib = "\x78\x01" .. table.concat(blocks) .. string.pack(">I4", adler32(raw))
  local plte, trns = {}, {}
  for index = 0, #palette - 1 do
    local c = palette:getColor(index)
    plte[#plte + 1] = string.char(c.red, c.green, c.blue)
    trns[#trns + 1] = string.char(c.alpha)
  end
  local png = "\x89PNG\r\n\x1a\n"
    .. chunk("IHDR", string.pack(">I4>I4BBBBB", width, height, 8, 3, 0, 0, 0))
    .. chunk("PLTE", table.concat(plte)) .. chunk("tRNS", table.concat(trns))
    .. chunk("IDAT", zlib) .. chunk("IEND", "")
  local file = assert(io.open(path, "wb"))
  file:write(png)
  file:close()
end

-- API ------------------------------------------------------------------------------------------
ColorMode = { RGB = 0, GRAYSCALE = 1, INDEXED = 2 }

function Color(t) return { red = t.r, green = t.g, blue = t.b, alpha = t.a } end
function Point(x, y) return { x = x, y = y } end

local PaletteMeta = { __len = function(p) return p.size end, __index = {} }
function PaletteMeta.__index:setColor(i, c) assert(i >= 0 and i < self.size, "palette index"); self.colors[i] = c end
function PaletteMeta.__index:getColor(i) return self.colors[i] or Color { r = 0, g = 0, b = 0, a = 255 } end
-- Palette(size), or Palette(otherPalette): a copy.
function Palette(n)
  if type(n) == "table" then
    local copy = setmetatable({ size = n.size, colors = {} }, PaletteMeta)
    for i, c in pairs(n.colors) do copy.colors[i] = c end
    return copy
  end
  return setmetatable({ size = n, colors = {} }, PaletteMeta)
end

local ImageMeta = { __index = {} }
function Image(width, height, mode)
  assert(mode == ColorMode.INDEXED, "indexed only")
  local data = {}
  for i = 1, width * height do data[i] = 0 end
  return setmetatable({ width = width, height = height, colorMode = mode, data = data }, ImageMeta)
end
function ImageMeta.__index:clear(v) for i = 1, self.width * self.height do self.data[i] = v or 0 end end
function ImageMeta.__index:drawPixel(x, y, v)
  assert(math.type(x) == "integer" and math.type(y) == "integer", "drawPixel needs integers")
  if x >= 0 and y >= 0 and x < self.width and y < self.height then self.data[y * self.width + x + 1] = v end
end
function ImageMeta.__index:getPixel(x, y) return self.data[y * self.width + x + 1] end
function ImageMeta.__index:pixels()
  local i = 0
  local n = self.width * self.height
  local image = self
  return function()
    i = i + 1
    if i > n then return nil end
    local index = i
    return setmetatable({ x = (index - 1) % image.width, y = (index - 1) // image.width },
      { __call = function() return image.data[index] end })
  end
end
function ImageMeta.__index:saveAs(t)
  writePng(t.filename, self.width, self.height, self.data, t.palette)
end

local LayerMeta = { __index = {} }
local function newLayer(name)
  return setmetatable({ name = name, opacity = 255, isEditable = true, isVisible = true, isGroup = false,
    isBackground = false, isTilemap = false, cels = {}, layers = {} }, LayerMeta)
end
function LayerMeta.__index:cel(frame) return self.cels[frame] end

local SpriteMeta = { __index = {} }
function Sprite(width, height, mode)
  local sprite = setmetatable({ width = width, height = height, colorMode = mode, layers = { newLayer("Layer 1") },
    frames = { { duration = 0.1 } }, tags = {}, palettes = { Palette(256) }, transparentColor = 0, filename = "" }, SpriteMeta)
  app.activeSprite = sprite
  return sprite
end
function SpriteMeta.__index:setPalette(p) self.palettes[1] = p end
function SpriteMeta.__index:newEmptyFrame() table.insert(self.frames, { duration = 0.1 }) end
function SpriteMeta.__index:newLayer() local l = newLayer("Layer " .. (#self.layers + 1)); table.insert(self.layers, l); return l end
function SpriteMeta.__index:newGroup() local l = newLayer("Group"); l.isGroup = true; table.insert(self.layers, l); return l end
function SpriteMeta.__index:newCel(layer, frame, image, position)
  assert(math.type(frame) == "integer" and frame >= 1 and frame <= #self.frames, "frame out of range")
  local cel = { image = image, position = position, frameNumber = frame, layer = layer }
  layer.cels[frame] = cel
  return cel
end
function SpriteMeta.__index:deleteCel(cel) cel.layer.cels[cel.frameNumber] = nil end
function SpriteMeta.__index:newTag(from, to)
  assert(from >= 1 and to <= #self.frames and from <= to, "tag range")
  local tag = { fromFrame = from, toFrame = to, name = "Tag" }
  table.insert(self.tags, tag)
  return tag
end
function SpriteMeta.__index:deleteTag(tag)
  for i, t in ipairs(self.tags) do if t == tag then table.remove(self.tags, i); return end end
end
function SpriteMeta.__index:saveAs(path)
  self.filename = path
  local file = assert(io.open(path, "wb")); file:write("mock aseprite"); file:close()
end

local DialogMeta = { __index = {} }
function Dialog(t) return setmetatable({ title = t.title, data = {} }, DialogMeta) end
function DialogMeta.__index:label() end
function DialogMeta.__index:file() end
function DialogMeta.__index:button() end
function DialogMeta.__index:show() self.data = DIALOG_DATA end

app = {
  activeSprite = nil,
  activeLayer = nil,
  command = { LayerFromBackground = function() end },
  transaction = function(fn) fn() end,
  refresh = function() end,
  alert = function(t)
    local text = type(t) == "table" and t.text or t
    if type(text) == "table" then text = table.concat(text, "\n") end
    table.insert(ALERTS, text)
  end,
  fs = {
    -- Both separators, as on Windows.
    filePath = function(p) return p:match("^(.*)[/\\][^/\\]*$") or "" end,
    fileName = function(p) return p:match("([^/\\]*)$") end,
    fileTitle = function(p) return (p:match("([^/\\]*)$"):gsub("%.[^.]*$", "")) end,
    joinPath = function(a, b) return a .. "/" .. b end,
    isFile = function(p) local f = io.open(p, "rb"); if f then f:close(); return true end; return false end,
    -- The check makes the folders the extension writes in beforehand: nothing to do here.
    makeAllDirectories = function() end,
  },
}

PLUGIN = {
  preferences = {},
  newCommand = function(_, t) COMMANDS[t.id] = t end,
  newMenuGroup = function() end,
}
