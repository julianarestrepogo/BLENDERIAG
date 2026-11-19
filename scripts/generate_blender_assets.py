"""
TYPE IN MOTION - Blender Asset Generator
Genera letras 3D, figuras geométricas y materiales editoriales vibrantes
exportándolos a formato glTF/GLB para el motor Three.js de la aplicación.
"""

import bpy
import math
import os
import sys

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "assets", "models"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"[BLENDER ASSET GEN] Generando assets 3D en: {OUTPUT_DIR}")

# Paleta de colores oficial TYPE IN MOTION
PALETTE = {
    "cream": (0.96, 0.949, 0.922, 1.0),      # #F5F2EB
    "black": (0.05, 0.05, 0.05, 1.0),        # #111111
    "electric_blue": (0.0, 0.22, 1.0, 1.0),  # #0038FF
    "vivid_orange": (1.0, 0.33, 0.0, 1.0),   # #FF5500
    "lime_green": (0.8, 1.0, 0.0, 1.0),      # #CCFF00
    "pure_white": (1.0, 1.0, 1.0, 1.0)
}

def clean_scene():
    """Limpia todos los objetos y mallas de la escena."""
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_plastic_material(name, color_rgba, roughness=0.15, metallic=0.05):
    """Crea un material estilo plástico glossy moderno editorial."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    principled = nodes.get("Principled BSDF")
    if principled:
        # Base Color
        principled.inputs["Base Color"].default_value = color_rgba
        # Roughness (brillante, plástico editorial)
        if "Roughness" in principled.inputs:
            principled.inputs["Roughness"].default_value = roughness
        if "Metallic" in principled.inputs:
            principled.inputs["Metallic"].default_value = metallic
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

# 1. Crear figuras geométricas abstractas
def generate_geometric_shapes():
    shapes = [
        ("torus_ring", "lime_green"),
        ("pill_capsule", "electric_blue"),
        ("beveled_cube", "vivid_orange"),
        ("graphic_disc", "cream"),
        ("abstract_cone", "black")
    ]

    for shape_name, color_key in shapes:
        clean_scene()
        mat = create_plastic_material(f"Mat_{shape_name}", PALETTE[color_key])

        if shape_name == "torus_ring":
            bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.35, major_segments=48, minor_segments=24)
            obj = bpy.context.active_object
        elif shape_name == "pill_capsule":
            bpy.ops.mesh.primitive_cylinder_add(radius=0.6, depth=1.4, vertices=32)
            obj = bpy.context.active_object
            # Biselado suave
            mod = obj.modifiers.new(name="Bevel", type='BEVEL')
            mod.width = 0.25
            mod.segments = 8
            bpy.ops.object.modifier_apply(modifier="Bevel")
        elif shape_name == "beveled_cube":
            bpy.ops.mesh.primitive_cube_add(size=1.6)
            obj = bpy.context.active_object
            mod = obj.modifiers.new(name="Bevel", type='BEVEL')
            mod.width = 0.18
            mod.segments = 6
            bpy.ops.object.modifier_apply(modifier="Bevel")
        elif shape_name == "graphic_disc":
            bpy.ops.mesh.primitive_cylinder_add(radius=1.1, depth=0.25, vertices=48)
            obj = bpy.context.active_object
            mod = obj.modifiers.new(name="Bevel", type='BEVEL')
            mod.width = 0.05
            mod.segments = 4
            bpy.ops.object.modifier_apply(modifier="Bevel")
        elif shape_name == "abstract_cone":
            bpy.ops.mesh.primitive_cone_add(radius1=0.9, depth=1.8, vertices=32)
            obj = bpy.context.active_object
            mod = obj.modifiers.new(name="Bevel", type='BEVEL')
            mod.width = 0.08
            mod.segments = 4
            bpy.ops.object.modifier_apply(modifier="Bevel")

        obj.data.materials.append(mat)
        bpy.ops.object.shade_smooth()
        obj.select_set(True)

        out_path = os.path.join(OUTPUT_DIR, f"{shape_name}.glb")
        export_glb(out_path)

# 2. Crear Letras 3D estilizadas
def generate_3d_letters():
    # Letras clave para el gameplay
    letters = ["T", "Y", "P", "E", "M", "O", "I", "N", "D", "S", "G", "R", "U", "H"]
    colors = ["electric_blue", "vivid_orange", "lime_green", "black", "cream"]

    for idx, letter in enumerate(letters):
        clean_scene()
        color_key = colors[idx % len(colors)]
        mat = create_plastic_material(f"Mat_Letter_{letter}", PALETTE[color_key])

        # Crear curva de texto en Blender
        bpy.ops.object.text_add(location=(0, 0, 0))
        text_obj = bpy.context.active_object
        text_obj.data.body = letter
        text_obj.data.extrude = 0.25          # Profundidad 3D
        text_obj.data.bevel_depth = 0.04      # Bisel elegante
        text_obj.data.bevel_resolution = 4    # Suavizado de esquinas
        text_obj.data.align_x = 'CENTER'
        text_obj.data.align_y = 'CENTER'

        # Convertir texto a malla para que Three.js lo cargue óptimamente
        bpy.ops.object.convert(target='MESH')
        mesh_obj = bpy.context.active_object
        mesh_obj.data.materials.append(mat)
        bpy.ops.object.shade_smooth()
        mesh_obj.select_set(True)

        out_path = os.path.join(OUTPUT_DIR, f"letter_{letter}.glb")
        export_glb(out_path)

if __name__ == "__main__":
    print("[1/2] Generando formas geométricas en Blender...")
    generate_geometric_shapes()
    print("[2/2] Generando letras 3D en Blender...")
    generate_3d_letters()
    print("[FIN] Todos los modelos 3D se generaron exitosamente.")
