"""
TYPE IN MOTION - Blender Asset Generator (v2.0)
Genera las 26 letras del abecedario (A-Z) y figuras geométricas 3D con:
- Orientación completamente FRONTAL (sin inclinación ni vista cenital)
- Nueva paleta cálida, vibrante y editorial:
  * Naranja:  #FF713B
  * Amarillo: #FFD65A
  * Rosado:   #FF91B5
  * Rojo:     #E84442
  * Crema:    #FFF7EB
  * Carbón:   #1A1110
- Acabados plásticos suaves y ligeramente brillantes
"""

import bpy
import math
import os
import sys

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "assets", "models"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"[BLENDER ASSET GEN] Generando assets 3D en: {OUTPUT_DIR}")

# Nueva paleta oficial cálida y vibrante (sRGB normalizado)
PALETTE = {
    "orange": (1.0, 0.443, 0.231, 1.0),    # #FF713B (Naranja vibrante)
    "yellow": (1.0, 0.839, 0.353, 1.0),    # #FFD65A (Amarillo cálido)
    "pink":   (1.0, 0.569, 0.710, 1.0),    # #FF91B5 (Rosado fresco)
    "red":    (0.910, 0.267, 0.259, 1.0),  # #E84442 (Rojo editorial)
    "cream":  (1.0, 0.969, 0.922, 1.0),    # #FFF7EB (Crema cálido)
    "dark":   (0.102, 0.067, 0.063, 1.0)   # #1A1110 (Carbón oscuro de alto contraste)
}

def clean_scene():
    """Limpia todos los objetos y mallas de la escena."""
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_smooth_plastic_material(name, color_rgba, roughness=0.20):
    """Crea un material estilo plástico suave y ligeramente brillante."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    principled = nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = color_rgba
        if "Roughness" in principled.inputs:
            principled.inputs["Roughness"].default_value = roughness
        if "Metallic" in principled.inputs:
            principled.inputs["Metallic"].default_value = 0.02
        if "Specular IOR Level" in principled.inputs:
            principled.inputs["Specular IOR Level"].default_value = 0.5
    return mat

def export_glb(filepath):
    """Exporta los objetos seleccionados a formato glTF/GLB."""
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_materials='EXPORT'
    )
    print(f"  -> Exportado: {os.path.basename(filepath)}")

# 1. Crear figuras geométricas abstractas (con orientación frontal)
def generate_geometric_shapes():
    shapes = [
        ("torus_ring", "pink"),
        ("pill_capsule", "yellow"),
        ("beveled_cube", "orange"),
        ("graphic_disc", "cream"),
        ("abstract_cone", "red"),
        ("star_element", "dark")
    ]

    for shape_name, color_key in shapes:
        clean_scene()
        mat = create_smooth_plastic_material(f"Mat_{shape_name}", PALETTE[color_key])

        if shape_name == "torus_ring":
            bpy.ops.mesh.primitive_torus_add(major_radius=0.9, minor_radius=0.32, major_segments=48, minor_segments=24)
            obj = bpy.context.active_object
            # Orientar el anillo de frente a la cámara (rotación de 90° en X)
            obj.rotation_euler = (math.radians(90), 0, 0)
            bpy.ops.object.transform_apply(rotation=True)
        elif shape_name == "pill_capsule":
            bpy.ops.mesh.primitive_cylinder_add(radius=0.55, depth=1.3, vertices=32)
            obj = bpy.context.active_object
            mod = obj.modifiers.new(name="Bevel", type='BEVEL')
            mod.width = 0.22
            mod.segments = 8
            bpy.ops.object.modifier_apply(modifier="Bevel")
        elif shape_name == "beveled_cube":
            bpy.ops.mesh.primitive_cube_add(size=1.4)
            obj = bpy.context.active_object
            mod = obj.modifiers.new(name="Bevel", type='BEVEL')
            mod.width = 0.16
            mod.segments = 6
            bpy.ops.object.modifier_apply(modifier="Bevel")
        elif shape_name == "graphic_disc":
            bpy.ops.mesh.primitive_cylinder_add(radius=1.0, depth=0.22, vertices=48)
            obj = bpy.context.active_object
            obj.rotation_euler = (math.radians(90), 0, 0)
            bpy.ops.object.transform_apply(rotation=True)
            mod = obj.modifiers.new(name="Bevel", type='BEVEL')
            mod.width = 0.04
            mod.segments = 4
            bpy.ops.object.modifier_apply(modifier="Bevel")
        elif shape_name == "abstract_cone":
            bpy.ops.mesh.primitive_cone_add(radius1=0.8, depth=1.5, vertices=32)
            obj = bpy.context.active_object
            mod = obj.modifiers.new(name="Bevel", type='BEVEL')
            mod.width = 0.06
            mod.segments = 4
            bpy.ops.object.modifier_apply(modifier="Bevel")
        elif shape_name == "star_element":
            # Crear un asterisco/estrella tipográfica tridimensional
            bpy.ops.mesh.primitive_cube_add(size=0.35)
            obj = bpy.context.active_object
            obj.scale = (4.0, 0.8, 0.8)
            bpy.ops.object.transform_apply(scale=True)
            # Duplicar cruzado
            bpy.ops.object.duplicate()
            dup = bpy.context.active_object
            dup.rotation_euler = (0, 0, math.radians(90))
            bpy.ops.object.transform_apply(rotation=True)
            # Unir
            obj.select_set(True)
            dup.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.join()

        obj.data.materials.append(mat)
        bpy.ops.object.shade_smooth()
        obj.select_set(True)

        out_path = os.path.join(OUTPUT_DIR, f"{shape_name}.glb")
        export_glb(out_path)

# 2. Crear las 26 Letras 3D (A-Z) con orientación FRONTAL
def generate_3d_letters():
    letters = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    # Alternar colores cálidos y alegres
    colors = ["orange", "yellow", "pink", "red", "dark"]

    for idx, letter in enumerate(letters):
        clean_scene()
        color_key = colors[idx % len(colors)]
        mat = create_smooth_plastic_material(f"Mat_Letter_{letter}", PALETTE[color_key])

        # Crear curva de texto en Blender
        bpy.ops.object.text_add(location=(0, 0, 0))
        text_obj = bpy.context.active_object
        text_obj.data.body = letter
        text_obj.data.extrude = 0.22          # Volumen y profundidad 3D
        text_obj.data.bevel_depth = 0.035     # Bisel suave en los bordes
        text_obj.data.bevel_resolution = 4    # Suavizado de curvas
        text_obj.data.align_x = 'CENTER'
        text_obj.data.align_y = 'CENTER'

        # Convertir texto a malla para manipulación
        bpy.ops.object.convert(target='MESH')
        mesh_obj = bpy.context.active_object

        # ¡CLAVE! Rotar 90° en el eje X para que la cara de la letra se coloque
        # de pie, totalmente vertical y frontal hacia la cámara al exportar.
        mesh_obj.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

        # Centrar el origen en la geometría
        bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

        mesh_obj.data.materials.append(mat)
        bpy.ops.object.shade_smooth()
        mesh_obj.select_set(True)

        out_path = os.path.join(OUTPUT_DIR, f"letter_{letter}.glb")
        export_glb(out_path)

if __name__ == "__main__":
    print("[1/2] Generando formas geométricas frontales...")
    generate_geometric_shapes()
    print("[2/2] Generando 26 letras 3D frontales (A-Z)...")
    generate_3d_letters()
    print("[FIN] Todos los modelos 3D frontales y materiales cálidos se generaron exitosamente.")
