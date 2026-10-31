-- NayosBeat : planches de sprites au format du jeu (docs/art/aseprite.md). Aseprite 1.3 ou plus.
--
-- Les gabarits viennent de `npm run sprites:templates` (art-src/gabarits/<perso>/<planche>.json,
-- écrits par tools/sprites/aseprite-template.ts). « Nouvelle planche » en fait le document
-- art-src/<perso>/<planche>.aseprite ; « Exporter vers le jeu » écrit art-src/<perso>/<planche>.png
-- (et fx/<planche>.png), que `npm run sprites` vérifie à nouveau et installe dans le jeu.
--
-- Les pixels sont des numéros de couleur (mode Indexé) : la tenue alt n'est qu'un changement de
-- palette, fait par le jeu. Plusieurs numéros ont la même couleur en main et pas en alt : seul le
-- numéro compte, jamais la couleur. Toute la logique de vérification vit côté Node ; ici, les
-- mêmes règles (lues dans le gabarit) préviennent avant d'écrire.

local TEMPLATE_FORMAT = "nayosbeat-template"
local TEMPLATE_VERSION = 1
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

-- art-src/gabarits/<perso>/<planche>.json  <->  art-src/<perso>/<planche>.aseprite
local function spritePathOf(templatePath)
  local folder = app.fs.filePath(templatePath)
  local templates = app.fs.filePath(folder)
  if app.fs.fileName(templates) ~= "gabarits" then
    fail("Un gabarit se choisit dans art-src/gabarits/<perso>/ :\n" .. templatePath)
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

-- Les pixels d'une case : des paires [nombre, couleur], rangée par rangée.
local function hasPixels(runs)
  for index = 2, #runs, 2 do
    if runs[index] ~= 0 then return true end
  end
  return false
end

local function cellImage(runs, cell)
  local image = Image(cell, cell, ColorMode.INDEXED)
  image:clear(0)
  local at = 0
  for index = 1, #runs, 2 do
    local count = math.floor(runs[index])
    local slot = math.floor(runs[index + 1])
    if slot ~= 0 then
      for pixel = at, at + count - 1 do
        image:drawPixel(pixel % cell, pixel // cell, slot)
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
  local cell = template.cell
  local sprite = Sprite(cell, cell, ColorMode.INDEXED)
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
        sprite:newCel(layer, frame, cellImage(runs, cell), Point(0, 0))
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

-- Recopie ce que `layer` dessine sur l'image `frame` dans `strip`, sa case commençant à la colonne
-- `left` : les sous-calques visibles d'un groupe, de bas en haut. L'opacité et les modes de fusion
-- sont ignorés (un pixel est un numéro de couleur), comme ce qui sort de la case.
local function copyInto(strip, left, layer, frame, cell)
  if layer.isGroup then
    for _, child in ipairs(layer.layers) do
      if child.isVisible then copyInto(strip, left, child, frame, cell) end
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
      if x >= 0 and x < cell and y >= 0 and y < cell then
        strip:drawPixel(left + x, y, slot)
      end
    end
  end
end

-- Les règles de `npm run sprites` (tools/sprites/drawn.ts), lues dans le gabarit. Les images sont
-- numérotées à partir de 1, comme dans Aseprite.
local function problemsOf(strip, rules, cell, label)
  local problems = {}
  local extents = {}
  for frame = 0, rules.frames - 1 do
    extents[frame] = { top = cell, bottom = -1, left = cell, right = -1 }
  end
  local guides = {}
  local drawn = false
  for pixel in strip:pixels() do
    local slot = pixel()
    if slot ~= 0 then
      drawn = true
      local frame = pixel.x // cell
      local x = pixel.x % cell
      if slot >= rules.slots and not guides[slot] then
        guides[slot] = true
        table.insert(problems, label .. ", image " .. (frame + 1) .. " (" .. x .. ", " .. pixel.y
          .. ") : la couleur " .. slot .. " est une couleur de guide, pas du personnage")
      end
      local extent = extents[frame]
      if pixel.y < extent.top then extent.top = pixel.y end
      if pixel.y > extent.bottom then extent.bottom = pixel.y end
      if x < extent.left then extent.left = x end
      if x > extent.right then extent.right = x end
    end
  end
  for frame = 0, rules.frames - 1 do
    local extent = extents[frame]
    local at = label .. ", image " .. (frame + 1)
    if extent.bottom < 0 then
      if rules.filled then table.insert(problems, at .. " : vide") end
    else
      local edge = math.min(extent.top, extent.left, cell - 1 - extent.right)
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

local function export(sprite)
  local template = sheetTemplate(sprite)
  local cell = template.cell
  if sprite.colorMode ~= ColorMode.INDEXED then
    fail("La planche doit rester en mode Indexé (Sprite > Mode couleur > Indexé) : le jeu lit les numéros de couleur.")
  end
  if sprite.width ~= cell or sprite.height ~= cell then
    fail("La planche doit faire " .. cell .. " × " .. cell .. " px (elle fait " .. sprite.width .. " × " .. sprite.height .. ").")
  end
  if #sprite.frames ~= template.frames then
    fail("La planche a " .. #sprite.frames .. " images, le jeu en attend " .. template.frames .. ".\n"
      .. "Le nombre d'images se change dans le code (src/art/<perso>/sheets.ts et clips.ts), puis les gabarits.")
  end
  local folder = app.fs.filePath(sprite.filename)
  local outputs = {}
  local problems = {}
  for _, spec in ipairs(template.layers) do
    if spec.file ~= nil then
      local layer = layerNamed(sprite, spec.name)
      local strip = Image(cell * template.frames, cell, ColorMode.INDEXED)
      strip:clear(0)
      if layer == nil then
        table.insert(problems, "Calque « " .. spec.name .. " » introuvable (ne le renommez pas).")
      else
        for frame = 1, template.frames do
          copyInto(strip, (frame - 1) * cell, layer, frame, cell)
        end
        local found, drawn = problemsOf(strip, spec.rules, cell, spec.name)
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
  local palette = paletteOf(template.palette.main)
  local written = {}
  for _, output in ipairs(outputs) do
    if output.drawn then
      app.fs.makeAllDirectories(app.fs.filePath(output.path))
      output.strip:saveAs { filename = output.path, palette = palette }
      table.insert(written, template.fighter .. "/" .. output.file)
    elseif app.fs.isFile(output.path) then
      -- Des effets vides : pas de fichier, pas d'effets dans le jeu.
      os.remove(output.path)
      table.insert(written, template.fighter .. "/" .. output.file .. " (supprimé : calque vide)")
    end
  end
  sprite:saveAs(sprite.filename)
  table.insert(written, 1, "Exporté dans art-src :")
  table.insert(written, "Lancez `npm run sprites` pour l'installer dans le jeu.")
  app.alert { title = TITLE, text = written }
end

-- Les guides, les durées et les étiquettes suivent les données du jeu : après un changement de
-- hitbox ou de durée, `npm run sprites:templates` puis cette commande.
local function refreshGuides(sprite)
  local template = sheetTemplate(sprite)
  if #sprite.frames ~= template.frames then
    fail("La planche a " .. #sprite.frames .. " images, son gabarit " .. template.frames .. ".")
  end
  local layer = layerNamed(sprite, GUIDES)
  local spec = nil
  for _, each in ipairs(template.layers) do
    if each.name == GUIDES then spec = each end
  end
  if layer == nil or spec == nil then fail("Calque « " .. GUIDES .. " » introuvable.") end
  app.transaction(function()
    sprite:setPalette(paletteOf(template.palette.main))
    for index, seconds in ipairs(template.durations) do
      sprite.frames[index].duration = seconds
    end
    setTags(sprite, template)
    layer.isEditable = true
    for frame, runs in ipairs(spec.frames) do
      local cel = layer:cel(frame)
      if cel ~= nil then sprite:deleteCel(cel) end
      if hasPixels(runs) then
        sprite:newCel(layer, frame, cellImage(runs, template.cell), Point(0, 0))
      end
    end
    layer.isEditable = false
  end)
  app.refresh()
end

-- Montre la planche dans l'autre tenue (les mêmes numéros, l'autre palette). L'export écrit
-- toujours la palette main, quelle que soit la tenue affichée.
local function toggleColorway(sprite)
  local template = sheetTemplate(sprite)
  local main = template.palette.main
  local alt = template.palette.alt
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
  dialog:label { text = "Un gabarit de art-src/gabarits/<perso>/ (npm run sprites:templates)" }
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
  -- Un sous-menu Fichier > Scripts > NayosBeat ; directement dans Scripts si ce n'est pas possible.
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
