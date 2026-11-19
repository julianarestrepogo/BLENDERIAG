"""
TYPE IN MOTION - Blender Scene Generator (v2.0)
Guarda la escena .blend nativa con:
- Colecciones organizadas: Iluminación frontal de estudio, Figuras geométricas y Letras 3D.
- Orientación completamente frontal (rotación aplicada, de pie frente a la cámara).
- Nueva paleta cálida y contemporánea:
  * Naranja:  #FF713B
  * Amarillo: #FFD65A
  * Rosado:   #FF91B5
  * Rojo:     #E84442
  * Crema:    #FFF7EB
  * Carbón:   #1A1110
"""

import bpy
import math
import os

PROJECT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BLENDER_DIR = os.path.join(PROJECT_DIR, "blender")
os.makedirs(BLENDER_DIR, exist_ok=True)
BLEND_PATH = os.path.join(BLENDER_DIR, "type_in_motion.blend")

print(f"[BLENDER] Creando escena nativa editable .blend en: {BLEND_PATH}")

bpy.ops.wm.read_factory_settings(use_empty=True)

# Nueva paleta oficial cálida
PALETTE = {
    "Mat_Orange": (1.0, 0.443, 0.231, 1.0),
    "Mat_Yellow": (1.0, 0.839, 0.353, 1.0),
    "Mat_Pink":   (1.0, 0.569, 0.710, 1.0),
    "Mat_Red":    (0.910, 0.267, 0.259, 1.0),
    "Mat_Cream":  (1.0, 0.969, 0.922, 1.0),
    "Mat_Dark":   (0.102, 0.067, 0.063, 1.0)
}

created_mats = {}
for name, color in PALETTE.items():
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = 0.20
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = 0.02
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = 0.5
    created_mats[name] = mat

# 1. Colección: Iluminación Frontal y Cámara Ortográfica/Frontal
col_studio = bpy.data.collections.new("01_Estudio_Frontal")
bpy.context.scene.collection.children.link(col_studio)

# Cámara frontal: situada en Y negativo mirando hacia el origen (sin inclinación cenital)
bpy.ops.object.camera_add(location=(0, -14, 0), rotation=(math.radians(90), 0, 0))
cam = bpy.context.active_object
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 14.0
col_studio.objects.link(cam)
bpy.context.scene.collection.objects.unlink(cam)
bpy.context.scene.camera = cam

# Luces de estudio suaves para resaltar volumen sin oscurecer
bpy.ops.object.light_add(type='SUN', location=(4, -10, 8))
sun = bpy.context.active_object
sun.name = "Key_Light_Warm"
sun.data.energy = 3.0
sun.data.color = (1.0, 0.98, 0.95)
col_studio.objects.link(sun)
bpy.context.scene.collection.objects.unlink(sun)

bpy.ops.object.light_add(type='POINT', location=(-6, -8, 2))
fill = bpy.context.active_object
fill.name = "Fill_Light_Pink"
fill.data.color = (1.0, 0.569, 0.710)
fill.data.energy = 400
col_studio.objects.link(fill)
bpy.context.scene.collection.objects.unlink(fill)

# 2. Colección: Figuras Geométricas Frontales
col_shapes = bpy.data.collections.new("02_Figuras_Geometricas")
bpy.context.scene.collection.children.link(col_shapes)

shapes_meta = [
    ("Torus_Ring", "Mat_Pink", (-5, 0, 2.5)),
    ("Beveled_Cube", "Mat_Orange", (-2.5, 0, 2.5)),
    ("Pill_Capsule", "Mat_Yellow", (0, 0, 2.5)),
    ("Graphic_Disc", "Mat_Cream", (2.5, 0, 2.5)),
    ("Abstract_Cone", "Mat_Red", (5, 0, 2.5))
]

for sname, mname, pos in shapes_meta:
    if "Torus" in sname:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.9, minor_radius=0.3, location=pos)
        bpy.context.active_object.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
    elif "Cube" in sname:
        bpy.ops.mesh.primitive_cube_add(size=1.4, location=pos)
        mod = bpy.context.active_object.modifiers.new("Bevel", 'BEVEL')
        mod.width = 0.15
    elif "Capsule" in sname:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.55, depth=1.3, location=pos)
        mod = bpy.context.active_object.modifiers.new("Bevel", 'BEVEL')
        mod.width = 0.2
    elif "Disc" in sname:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.9, depth=0.22, location=pos)
        bpy.context.active_object.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
    elif "Cone" in sname:
        bpy.ops.mesh.primitive_cone_add(radius1=0.8, depth=1.5, location=pos)

    obj = bpy.context.active_object
    obj.name = sname
    obj.data.materials.append(created_mats[mname])
    bpy.ops.object.shade_smooth()
    col_shapes.objects.link(obj)
    bpy.context.scene.collection.objects.unlink(obj)

# 3. Colección: Letras 3D Frontales
col_letters = bpy.data.collections.new("03_Letras_3D_Frontales")
bpy.context.scene.collection.children.link(col_letters)

letters = ["T", "Y", "P", "E", "M", "O", "T", "I", "O", "N"]
mat_keys = ["Mat_Orange", "Mat_Yellow", "Mat_Pink", "Mat_Red", "Mat_Dark"]

for idx, char in enumerate(letters):
    x_pos = (idx - len(letters) / 2) * 1.3
    bpy.ops.object.text_add(location=(x_pos, 0, -2))
    txt = bpy.context.active_object
    txt.name = f"Letter_{char}_{idx}"
    txt.data.body = char
    txt.data.extrude = 0.22
    txt.data.bevel_depth = 0.035
    txt.data.bevel_resolution = 4
    txt.data.align_x = 'CENTER'
    txt.data.align_y = 'CENTER'

    bpy.ops.object.convert(target='MESH')
    mesh_obj = bpy.context.active_object
    mesh_obj.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)

    mkey = mat_keys[idx % len(mat_keys)]
    mesh_obj.data.materials.append(created_mats[mkey])

    col_letters.objects.link(mesh_obj)
    bpy.context.scene.collection.objects.unlink(mesh_obj)

# Guardar archivo .blend
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
print(f"[BLENDER] Escena nativa frontal guardada exitosamente en: {BLEND_PATH}")
