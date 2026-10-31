-- NayosBeat: sprite strips in the game's format (docs/art/aseprite.md). Aseprite 1.3 or later.
--
-- The templates come from `npm run sprites:templates` (art-src/gabarits/<fighter>/<strip>.json,
-- written by tools/sprites/aseprite-template.ts). "Nouvelle planche" makes one into the document
-- art-src/<fighter>/<strip>.aseprite; "Exporter vers le jeu" writes art-src/<fighter>/<strip>.png
-- (and fx/<strip>.png), which `npm run sprites` checks again and puts in the game.
--
-- A fighter's pixels are palette slots (Indexed mode): the second colorway is only another palette,
-- swapped by the game. Several slots share a color in the main colorway and not in the other one:
-- only the slot counts, never the color. The UI images (art-src/ui/: the title's vinyl, the icons'
-- master) have a free palette instead (`palette.free`): the export writes the drawing's own. Every decision is made on the Node side, in the template; here,
-- the same rules (read from it) warn before anything is written. The text shown is French, the
-- game's language. Tested outside Aseprite by `npm run aseprite:check` (tools/aseprite/test/).

local TEMPLATE_FORMAT = "nayosbeat-template"
local TEMPLATE_VERSION = 3
local TITLE = "NayosBeat"
local GUIDES = "guides"

local function fail(message)
  error(message, 0)
end

local function linesOf(text)
  local lines = {}
  for line in (text .. "\n"):gmatch("(.-)\n") do
    table.insert(lines, line)
  end
  return lines
end

local function readTemplate(path)
  local file = io.open(path, "rb")
  if not file then
    fail("Gabarit introuvable :\n" .. path .. "\nLancez `npm run sprites:templates` dans le dossier du jeu.")
  end
  local text = file:read("a")
  file:close()
  local ok, template = pcall(json.decode, text)
  if not ok or type(template) ~= "table" or template.format ~= TEMPLATE_FORMAT then
    fail("Ce fichier n'est pas un gabarit NayosBeat :\n" .. path)
  end
  if template.version ~= TEMPLATE_VERSION then
    fail("Ce gabarit est d'une autre version (" .. tostring(template.version) .. ").\n"
      .. "Réinstallez l'extension (`npm run aseprite:extension`) et relancez `npm run sprites:templates`.")
  end
  return template
end

-- art-src/gabarits/<fighter>/<strip>.json  <->  art-src/<fighter>/<strip>.aseprite
local function spritePathOf(templatePath)
  local folder = app.fs.filePath(templatePath)
  local templates = app.fs.filePath(folder)
  if app.fs.fileName(templates) ~= "gabarits" then
    fail("Un gabarit se choisit dans art-src/gabarits/<perso ou ui>/ :\n" .. templatePath)
  end
  local fighter = app.fs.joinPath(app.fs.filePath(templates), app.fs.fileName(folder))
  return app.fs.joinPath(fighter, app.fs.fileTitle(templatePath) .. ".aseprite")
end

local function templatePathOf(spritePath)
  local folder = app.fs.filePath(spritePath)
  local templates = app.fs.joinPath(app.fs.filePath(folder), "gabarits")
  return app.fs.joinPath(app.fs.joinPath(templates, app.fs.fileName(folder)), app.fs.fileTitle(spritePath) .. ".json")
end

local function sheetTemplate(sprite)
  if sprite.filename == nil or sprite.filename == "" or not app.fs.isFile(sprite.filename) then
    fail("Cette planche n'est pas enregistrée : créez-la avec « Nouvelle planche » (elle se range dans art-src/<perso>/).")
  end
  return readTemplate(templatePathOf(sprite.filename))
end

local function colorOf(hex)
  return Color {
    r = tonumber(hex:sub(2, 3), 16),
    g = tonumber(hex:sub(4, 5), 16),
    b = tonumber(hex:sub(6, 7), 16),
    a = tonumber(hex:sub(8, 9), 16),
  }
end

local function paletteOf(colors)
  local palette = Palette(#colors)
  for index, hex in ipairs(colors) do
    palette:setColor(index - 1, colorOf(hex))
  end
  return palette
end

-- The pixels of a cell: pairs [count, slot], row by row.
local function hasPixels(runs)
  for index = 2, #runs, 2 do
    if runs[index] ~= 0 then return true end
  end
  return false
end

local function cellImage(runs, width, height)
  local image = Image(width, height, ColorMode.INDEXED)
  image:clear(0)
  local at = 0
  for index = 1, #runs, 2 do
    local count = math.floor(runs[index])
    local slot = math.floor(runs[index + 1])
    if slot ~= 0 then
      for pixel = at, at + count - 1 do
        image:drawPixel(pixel % width, pixel // width, slot)
      end
    end
    at = at + count
  end
  return image
end

local function layerNamed(sprite, name)
  for _, layer in ipairs(sprite.layers) do
    if layer.name == name then return layer end
  end
  return nil
end

local function setTags(sprite, template)
  for index = #sprite.tags, 1, -1 do
    local tag = sprite.tags[index]
    for _, spec in ipairs(template.tags) do
      if tag.name == spec.name then
        sprite:deleteTag(tag)
        break
      end
    end
  end
  for _, spec in ipairs(template.tags) do
    local tag = sprite:newTag(spec.from + 1, spec.to + 1)
    tag.name = spec.name
    tag.color = colorOf(spec.color)
  end
end

local function newSheet(templatePath)
  local template = readTemplate(templatePath)
  local target = spritePathOf(templatePath)
  if app.fs.isFile(target) then
    fail("Cette planche existe déjà :\n" .. target .. "\nOuvrez-la avec Fichier > Ouvrir.")
  end
  local sprite = Sprite(template.width, template.height, ColorMode.INDEXED)
  sprite:setPalette(paletteOf(template.palette.main))
  sprite.transparentColor = 0
  for _ = 2, template.frames do
    sprite:newEmptyFrame()
  end
  for index, seconds in ipairs(template.durations) do
    sprite.frames[index].duration = seconds
  end
  local drawing = nil
  for index, spec in ipairs(template.layers) do
    local layer = index == 1 and sprite.layers[1] or sprite:newLayer()
    if layer.isBackground then
      app.activeLayer = layer
      app.command.LayerFromBackground()
      layer = sprite.layers[1]
    end
    layer.name = spec.name
    for frame, runs in ipairs(spec.frames) do
      if hasPixels(runs) then
        sprite:newCel(layer, frame, cellImage(runs, template.width, template.height), Point(0, 0))
      end
    end
    layer.opacity = spec.opacity
    layer.isEditable = not spec.locked
    if spec.file ~= nil and drawing == nil then drawing = layer end
  end
  setTags(sprite, template)
  app.fs.makeAllDirectories(app.fs.filePath(target))
  sprite:saveAs(target)
  if drawing ~= nil then app.activeLayer = drawing end
end

-- Copies what `layer` draws on frame `frame` into `strip`, its cell starting at column `left`: the
-- visible sublayers of a group, bottom to top. Layer opacity and blend modes are ignored (a pixel
-- is a slot), and so is what lies outside the cell.
local function copyInto(strip, left, layer, frame, width, height)
  if layer.isGroup then
    for _, child in ipairs(layer.layers) do
      if child.isVisible then copyInto(strip, left, child, frame, width, height) end
    end
    return
  end
  if layer.isTilemap then
    fail("Le calque « " .. layer.name .. " » est un calque de tuiles : dessinez sur un calque normal.")
  end
  local cel = layer:cel(frame)
  if cel == nil then return end
  local position = cel.position
  for pixel in cel.image:pixels() do
    local slot = pixel()
    if slot ~= 0 then
      local x = pixel.x + position.x
      local y = pixel.y + position.y
      if x >= 0 and x < width and y >= 0 and y < height then
        strip:drawPixel(left + x, y, slot)
      end
    end
  end
end

-- The checks of `npm run sprites` (tools/sprites/drawn.ts), with the rules the template gives and
-- the palette the strip is written with. Frames are numbered from 1, as Aseprite does.
local function problemsOf(strip, rules, palette, label)
  local width = rules.width
  local problems = {}
  local extents = {}
  for frame = 0, rules.frames - 1 do
    extents[frame] = { top = rules.height, bottom = -1, left = width, right = -1 }
  end
  local seen = {}
  local hole = nil
  local drawn = false
  for pixel in strip:pixels() do
    local slot = pixel()
    local frame = pixel.x // width
    local x = pixel.x % width
    local at = label .. ", image " .. (frame + 1) .. " (" .. x .. ", " .. pixel.y .. ")"
    local alpha = slot < #palette and palette:getColor(slot).alpha or 255
    if slot == 0 or alpha == 0 then
      if rules.transparency == "none" and hole == nil then hole = at end
    else
      drawn = true
      if not seen[slot] then
        seen[slot] = true
        if slot >= rules.slots then
          table.insert(problems, at .. " : la couleur " .. slot .. " est une couleur de guide, pas du personnage")
        elseif rules.transparency ~= "any" and alpha ~= 255 then
          table.insert(problems, at .. " : la couleur " .. slot .. " est à demi transparente (seulement opaque ou transparent)")
        end
      end
      local extent = extents[frame]
      if pixel.y < extent.top then extent.top = pixel.y end
      if pixel.y > extent.bottom then extent.bottom = pixel.y end
      if x < extent.left then extent.left = x end
      if x > extent.right then extent.right = x end
    end
  end
  if hole ~= nil then table.insert(problems, hole .. " : transparent, ce calque doit être opaque partout") end
  for frame = 0, rules.frames - 1 do
    local extent = extents[frame]
    local at = label .. ", image " .. (frame + 1)
    if extent.bottom < 0 then
      if rules.filled then table.insert(problems, at .. " : vide") end
    else
      local edge = math.min(extent.top, extent.left, width - 1 - extent.right)
      if edge < rules.margin then
        table.insert(problems, at .. " : à " .. edge .. " px du bord de la case (" .. rules.margin .. " au moins)")
      end
      if extent.bottom > rules.lowestRow then
        table.insert(problems, at .. " : dessine sous le sol, jusqu'à la rangée " .. extent.bottom
          .. " (" .. rules.lowestRow .. " au plus)")
      end
      if rules.groundRow ~= nil and extent.bottom < rules.groundRow then
        table.insert(problems, at .. " : les pieds flottent, le pixel le plus bas est rangée " .. extent.bottom
          .. " (" .. rules.groundRow .. " au moins)")
      end
    end
  end
  return problems, drawn
end

-- The palette the PNGs are written with: the fighter's main colorway, or a free one's own, its slot
-- 0 transparent whatever color it shows (Aseprite's transparent color).
local function exportPalette(template, sprite)
  if not template.palette.free then return paletteOf(template.palette.main) end
  local palette = Palette(sprite.palettes[1])
  palette:setColor(0, Color { r = 0, g = 0, b = 0, a = 0 })
  return palette
end

local function export(sprite)
  local template = sheetTemplate(sprite)
  local width = template.width
  local height = template.height
  if sprite.colorMode ~= ColorMode.INDEXED then
    fail("La planche doit rester en mode Indexé (Sprite > Mode couleur > Indexé) : le jeu lit les numéros de couleur.")
  end
  if sprite.width ~= width or sprite.height ~= height then
    fail("La planche doit faire " .. width .. " × " .. height .. " px (elle fait " .. sprite.width .. " × " .. sprite.height .. ").")
  end
  if #sprite.frames ~= template.frames then
    fail("La planche a " .. #sprite.frames .. " images, le jeu en attend " .. template.frames .. ".\n"
      .. (template.palette.free and "Ce format est celui que le jeu affiche (docs/art/aseprite.md)."
        or "Le nombre d'images se change dans le code (src/art/<perso>/sheets.ts et clips.ts), puis les gabarits."))
  end
  local folder = app.fs.filePath(sprite.filename)
  local palette = exportPalette(template, sprite)
  local outputs = {}
  local problems = {}
  for _, spec in ipairs(template.layers) do
    if spec.file ~= nil then
      local layer = layerNamed(sprite, spec.name)
      local strip = Image(width * template.frames, height, ColorMode.INDEXED)
      strip:clear(0)
      if layer == nil then
        table.insert(problems, "Calque « " .. spec.name .. " » introuvable (ne le renommez pas).")
      else
        for frame = 1, template.frames do
          copyInto(strip, (frame - 1) * width, layer, frame, width, height)
        end
        local found, drawn = problemsOf(strip, spec.rules, palette, spec.name)
        for _, problem in ipairs(found) do
          table.insert(problems, problem)
        end
        table.insert(outputs, { strip = strip, path = app.fs.joinPath(folder, spec.file), file = spec.file, drawn = drawn })
      end
    end
  end
  if #problems > 0 then
    local shown = { "Rien n'a été exporté :" }
    for index = 1, math.min(#problems, 15) do
      table.insert(shown, problems[index])
    end
    if #problems > 15 then table.insert(shown, "… et " .. (#problems - 15) .. " autres.") end
    fail(table.concat(shown, "\n"))
  end
  local written = {}
  for _, output in ipairs(outputs) do
    if output.drawn then
      app.fs.makeAllDirectories(app.fs.filePath(output.path))
      output.strip:saveAs { filename = output.path, palette = palette }
      table.insert(written, template.folder .. "/" .. output.file)
    elseif app.fs.isFile(output.path) then
      -- Empty effects: no file, no effects in the game.
      os.remove(output.path)
      table.insert(written, template.folder .. "/" .. output.file .. " (supprimé : calque vide)")
    end
  end
  sprite:saveAs(sprite.filename)
  table.insert(written, 1, "Exporté dans art-src :")
  table.insert(written, "Lancez `npm run sprites` pour l'installer dans le jeu.")
  app.alert { title = TITLE, text = written }
end

-- The guides, durations and tags follow the game's data: after a hitbox or a duration changes,
-- `npm run sprites:templates`, then this command. A free palette is the drawing's: it stays.
local function refreshGuides(sprite)
  local template = sheetTemplate(sprite)
  if #sprite.frames ~= template.frames then
    fail("La planche a " .. #sprite.frames .. " images, son gabarit " .. template.frames .. ".")
  end
  local spec = nil
  for _, each in ipairs(template.layers) do
    if each.name == GUIDES then spec = each end
  end
  local layer = layerNamed(sprite, GUIDES)
  if spec ~= nil and layer == nil then fail("Calque « " .. GUIDES .. " » introuvable.") end
  app.transaction(function()
    if not template.palette.free then sprite:setPalette(paletteOf(template.palette.main)) end
    for index, seconds in ipairs(template.durations) do
      sprite.frames[index].duration = seconds
    end
    setTags(sprite, template)
    if spec == nil then return end
    layer.isEditable = true
    for frame, runs in ipairs(spec.frames) do
      local cel = layer:cel(frame)
      if cel ~= nil then sprite:deleteCel(cel) end
      if hasPixels(runs) then
        sprite:newCel(layer, frame, cellImage(runs, template.width, template.height), Point(0, 0))
      end
    end
    layer.isEditable = false
  end)
  app.refresh()
end

-- Shows the strip in the other colorway (the same slots, the other palette). The export always
-- writes the main palette, whichever colorway is shown.
local function toggleColorway(sprite)
  local template = sheetTemplate(sprite)
  local main = template.palette.main
  local alt = template.palette.alt
  if alt == nil then fail("Cette image n'a qu'une tenue : seuls les combattants en ont deux.") end
  local current = sprite.palettes[1]
  local showingMain = true
  for index = 1, #main do
    if main[index] ~= alt[index] and index - 1 < #current then
      local color = current:getColor(index - 1)
      local hex = string.format("#%02x%02x%02x%02x", color.red, color.green, color.blue, color.alpha)
      showingMain = hex == main[index]
      break
    end
  end
  app.transaction(function()
    sprite:setPalette(paletteOf(showingMain and alt or main))
  end)
  app.refresh()
end

local function askTemplate(plugin)
  local dialog = Dialog { title = "Nouvelle planche NayosBeat" }
  dialog:label { text = "Un gabarit de art-src/gabarits/<perso ou ui>/ (npm run sprites:templates)" }
  dialog:file {
    id = "template",
    label = "Gabarit",
    open = true,
    filetypes = { "json" },
    filename = plugin.preferences.template or "",
  }
  dialog:button { id = "ok", text = "Créer", focus = true }
  dialog:button { id = "cancel", text = "Annuler" }
  dialog:show()
  local data = dialog.data
  if not data.ok or data.template == nil or data.template == "" then return nil end
  plugin.preferences.template = data.template
  return data.template
end

local function run(action)
  return function()
    if json == nil then
      app.alert { title = TITLE, text = "Il faut Aseprite 1.3 ou plus récent (module json)." }
      return
    end
    local ok, message = pcall(action)
    if not ok then app.alert { title = TITLE, text = linesOf(tostring(message)) } end
  end
end

local function withSprite(action)
  return run(function()
    local sprite = app.activeSprite
    if sprite == nil then fail("Ouvrez d'abord une planche NayosBeat (art-src/<perso>/<planche>.aseprite).") end
    action(sprite)
  end)
end

function init(plugin)
  -- A File > Scripts > NayosBeat submenu; straight in Scripts when that cannot be made.
  local group = "file_scripts"
  local grouped = pcall(function()
    plugin:newMenuGroup { id = "nayosbeat_menu", title = "NayosBeat", group = "file_scripts" }
  end)
  if grouped then group = "nayosbeat_menu" end
  local hasSprite = function() return app.activeSprite ~= nil end
  plugin:newCommand {
    id = "NayosBeatNewSheet",
    title = "Nouvelle planche…",
    group = group,
    onclick = run(function()
      local path = askTemplate(plugin)
      if path ~= nil then newSheet(path) end
    end),
  }
  plugin:newCommand {
    id = "NayosBeatExport",
    title = "Exporter vers le jeu",
    group = group,
    onenabled = hasSprite,
    onclick = withSprite(export),
  }
  plugin:newCommand {
    id = "NayosBeatRefreshGuides",
    title = "Mettre à jour les guides",
    group = group,
    onenabled = hasSprite,
    onclick = withSprite(refreshGuides),
  }
  plugin:newCommand {
    id = "NayosBeatColorway",
    title = "Tenue main / alt",
    group = group,
    onenabled = hasSprite,
    onclick = withSprite(toggleColorway),
  }
end

function exit(plugin)
end
