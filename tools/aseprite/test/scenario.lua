-- What an artist does with the extension, run against the stand-in API (aseprite-mock.lua) by
-- `npm run aseprite:check` (../check.ts), which wrote the templates and then reads back what this
-- exports. Arguments: the art folder (art-src's stand-in), the mock, the extension.

assert(_VERSION == "Lua 5.4", "Aseprite runs Lua 5.4; this is " .. _VERSION)
local root, mock, extension = arg[1], arg[2], arg[3]
dofile(mock)
dofile(extension)
init(PLUGIN)

local function lastAlert()
  return ALERTS[#ALERTS] or ""
end

local function click(id)
  COMMANDS[id].onclick()
end

local function newSheet(name, folder)
  DIALOG_DATA = { ok = true, template = root .. "/gabarits/" .. (folder or "nayo") .. "/" .. name .. ".json" }
  local before = #ALERTS
  click("NayosBeatNewSheet")
  assert(#ALERTS == before, name .. " not created: " .. lastAlert())
  return app.activeSprite
end

local function export(sprite)
  app.activeSprite = sprite
  click("NayosBeatExport")
  return lastAlert()
end

local function exported(sprite, ...)
  local text = export(sprite)
  assert(text:find("^Exporté dans art%-src"), "export refused: " .. text)
  for _, file in ipairs({ ... }) do
    assert(text:find(file, 1, true), file .. " not exported: " .. text)
  end
end

local function refused(sprite, expected)
  local text = export(sprite)
  assert(text:find(expected, 1, true), "expected « " .. expected .. " », got: " .. text)
end

local function exists(path)
  local file = io.open(root .. "/" .. path, "rb")
  if file then file:close() end
  return file ~= nil
end

-- A new strip: its layers, frames, durations, tags and palette, then exported as it came.
local idle = newSheet("idle")
local names = {}
for _, layer in ipairs(idle.layers) do
  names[#names + 1] = layer.name
end
assert(table.concat(names, ",") == "corps,effets,guides", table.concat(names, ","))
assert(idle.layers[3].isEditable == false, "the guides are locked")
assert(#idle.frames == 10 and math.abs(idle.frames[1].duration - 0.1) < 1e-9, "10 frames of 6 ticks")
assert(#idle.tags == 1 and idle.tags[1].name == "boucle", "the loop is tagged")
assert(idle.filename:find("/nayo/idle%.aseprite$"), idle.filename)
exported(idle, "nayo/idle.png")

-- A strip drawn in a group: its hidden sketch stays out, its visible retouch goes in.
local jab = newSheet("standLight")
local body = jab.layers[1]
body.name = "base"
-- Each layer draws one pixel on frame 2, at its own place (check.ts expects the retouch's only).
local function layerWith(name, visible, x, y)
  local image = Image(256, 256, ColorMode.INDEXED)
  image:drawPixel(x, y, 5)
  return {
    name = name,
    isVisible = visible,
    isGroup = false,
    cels = { [2] = { image = image, position = Point(0, 0) } },
    cel = function(self, frame) return self.cels[frame] end,
  }
end
jab.layers[1] = {
  name = "corps",
  isGroup = true,
  isVisible = true,
  layers = { body, layerWith("croquis", false, 30, 40), layerWith("retouche", true, 200, 100) },
}
exported(jab, "nayo/standLight.png", "nayo/fx/standLight.png")

-- A projectile, and a Remix's platine effects over the body of its special.
exported(newSheet("projectile"), "nayo/projectile.png")
exported(newSheet("specialBoost"), "nayo/fx/specialBoost.png")

-- Effects emptied: their file goes.
local block = newSheet("block")
exported(block, "nayo/fx/block.png")
assert(exists("nayo/fx/block.png"))
block.layers[2].cels = {}
exported(block, "nayo/block.png", "supprimé : calque vide")
assert(not exists("nayo/fx/block.png"), "emptied effects keep their file")

-- A guide's color in the body: refused, nothing written.
local crouch = newSheet("crouch")
local guide = Image(256, 256, ColorMode.INDEXED)
guide:drawPixel(10, 10, #crouch.palettes[1] - 1)
crouch:newCel(crouch.layers[1], 1, guide, Point(0, 0))
refused(crouch, "couleur de guide")
assert(not exists("nayo/crouch.png"), "a refused strip was written")

-- One frame too many: refused.
local walk = newSheet("walkForward")
walk:newEmptyFrame()
refused(walk, "le jeu en attend 12")

-- A strip made twice: refused, the first one kept.
DIALOG_DATA = { ok = true, template = root .. "/gabarits/nayo/idle.json" }
click("NayosBeatNewSheet")
assert(lastAlert():find("existe déjà", 1, true), lastAlert())

-- The colorway, on a slot whose colors differ; the export stays in the main colorway.
local template = json.decode(assert(io.open(root .. "/gabarits/nayo/idle.json")):read("a"))
local slot = nil
for index = 1, #template.palette.main do
  if template.palette.main[index] ~= template.palette.alt[index] then
    slot = index - 1
    break
  end
end
assert(slot ~= nil, "both colorways differ somewhere")
local function shown()
  local c = idle.palettes[1]:getColor(slot)
  return string.format("#%02x%02x%02x%02x", c.red, c.green, c.blue, c.alpha)
end
app.activeSprite = idle
click("NayosBeatColorway")
assert(shown() == template.palette.alt[slot + 1], "alt shown: " .. shown())
exported(idle, "nayo/idle.png")
click("NayosBeatColorway")
assert(shown() == template.palette.main[slot + 1], "main shown again: " .. shown())

-- The guides refreshed: tags replaced, not doubled.
local alerts = #ALERTS
click("NayosBeatRefreshGuides")
assert(#ALERTS == alerts, lastAlert())
assert(#idle.tags == 1, "tags doubled: " .. #idle.tags)

-- The title's vinyl: a free palette, recolored in Aseprite and exported with it (check.ts wants
-- its cyan mark magenta).
local vinyl = newSheet("vinyl", "ui")
assert(#vinyl.frames == 8 and math.abs(vinyl.frames[1].duration - 0.225) < 1e-9, "8 frames of 0.225 s")
assert(#vinyl.layers == 1 and vinyl.layers[1].name == "dessin", "one layer")
assert(#vinyl.tags == 1 and vinyl.tags[1].name == "boucle", "the turn loops")
local recolored = 0
for index = 0, #vinyl.palettes[1] - 1 do
  local c = vinyl.palettes[1]:getColor(index)
  if c.red == 0x00 and c.green == 0xb8 and c.blue == 0xd0 then
    vinyl.palettes[1]:setColor(index, Color { r = 0xff, g = 0x00, b = 0xaa, a = 255 })
    recolored = recolored + 1
  end
end
assert(recolored == 1, "the mark's color, once: " .. recolored)
-- The transparent slot given a color in the palette: what it fills stays transparent.
vinyl.palettes[1]:setColor(0, Color { r = 0xff, g = 0x00, b = 0x00, a = 255 })
exported(vinyl, "ui/vinyl.png")

-- One colorway only, no guides: told, and the free palette kept when the rest is refreshed.
app.activeSprite = vinyl
click("NayosBeatColorway")
assert(lastAlert():find("qu'une tenue", 1, true), lastAlert())
alerts = #ALERTS
click("NayosBeatRefreshGuides")
assert(#ALERTS == alerts, lastAlert())
assert(#vinyl.tags == 1, "tags doubled: " .. #vinyl.tags)
local still = 0
for index = 0, #vinyl.palettes[1] - 1 do
  local c = vinyl.palettes[1]:getColor(index)
  if c.red == 0xff and c.green == 0x00 and c.blue == 0xaa then still = still + 1 end
end
assert(still == 1, "the refresh put the palette back")

-- A frame more: refused, the format is the title's.
vinyl:newEmptyFrame()
refused(vinyl, "le jeu en attend 8")
table.remove(vinyl.frames)

-- The icons' master, exported as it came.
exported(newSheet("icon", "ui"), "ui/icon.png")

-- Nayo's portrait: 96 px, his palette, both colorways.
local portrait = newSheet("portrait", "nayo")
assert(portrait.width == 96 and portrait.height == 96 and #portrait.frames == 1, "96 px, one frame")
app.activeSprite = portrait
alerts = #ALERTS
click("NayosBeatColorway")
assert(#ALERTS == alerts, "a portrait has two colorways: " .. lastAlert())
click("NayosBeatColorway")
exported(portrait, "nayo/portrait.png")

-- The stage's far layer: 1200 × 540 (as fine as the fighters), from the code's street, opaque
-- everywhere. A hole is refused, then mended.
local far = newSheet("far", "rue")
assert(far.width == 1200 and far.height == 540, "the far layer's size")
assert(#far.layers == 2 and far.layers[2].name == "guides", "the ground line as a guide")
local sky = far.layers[1]:cel(1).image
local was = sky:getPixel(5, 5)
assert(was ~= 0, "the code's sky is opaque")
sky:drawPixel(5, 5, 0)
refused(far, "doit être opaque partout")
sky:drawPixel(5, 5, was)
exported(far, "rue/far.png")

-- The floor: 1920 × 80, whole pixels only. A half-transparent color is refused, then made opaque.
local floor = newSheet("floor", "rue")
assert(floor.width == 1920 and floor.height == 80, "the floor's size")
local ground = floor.palettes[1]:getColor(2)
floor.palettes[1]:setColor(2, Color { r = ground.red, g = ground.green, b = ground.blue, a = 128 })
refused(floor, "à demi transparente")
floor.palettes[1]:setColor(2, Color { r = ground.red, g = ground.green, b = ground.blue, a = 255 })
exported(floor, "rue/floor.png")

-- The middle layer, emptied, writes nothing: the code's stays.
local mid = newSheet("mid", "rue")
assert(mid.width == 1440 and mid.height == 540, "the middle layer's size")
mid.layers[1]:cel(1).image:clear()
local before = #ALERTS
export(mid)
assert(#ALERTS == before + 1 and not lastAlert():find("mid.png", 1, true), lastAlert())
assert(not exists("rue/mid.png"), "an empty middle layer was written")

print("scenario.lua: every step passed")
