"""Builds the prompt2md crane as a real 3D papercraft mesh and renders a
turntable sequence. Run headless:

  blender --background --factory-startup --python blender/build_crane.py -- \
      --frames 48 --res 720 --out blender/render --hero-only

Facet coordinates match apps/web/app/icon.svg exactly (0-64 space, Y-flipped
since SVG Y grows downward and Blender Y grows "into" screen depth here —
we treat SVG (x, y) as (x, -y) on a vertical XZ plane facing +Y).
"""

import math
import sys

import bpy

ARGV = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def arg(name: str, default: str) -> str:
    if name in ARGV:
        return ARGV[ARGV.index(name) + 1]
    return default


FRAMES = int(arg("--frames", "48"))
RES = int(arg("--res", "720"))
OUT = arg("--out", "blender/render")
HERO_ONLY = "--hero-only" in ARGV

SCALE = 0.09

FACETS = [
    ("body", [(20, 44), (26, 36), (40, 36), (46, 44), (33, 50)], "lavender", (0, 0, 0)),
    ("wing", [(26, 36), (40, 36), (35, 14)], "white", (-9, 1, 0)),
    ("neck", [(20, 44), (26, 36), (16, 19)], "white", (3, -13, 1)),
    ("tail", [(46, 44), (40, 36), (56, 32)], "lavender", (-5, 10, -1)),
    ("beak", [(16, 19), (9, 23), (17, 24)], "ink", (3, -13, 1)),
]

COLORS = {
    "white": (0.984, 0.976, 0.961, 1.0),
    "lavender": (0.780, 0.737, 0.949, 1.0),
    "ink": (0.09, 0.082, 0.102, 1.0),
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block_coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for block in list(block_coll):
            if block.users == 0:
                block_coll.remove(block)


def make_material(name: str, rgba: tuple[float, float, float, float]) -> bpy.types.Material:
    # Emission sets a guaranteed colour FLOOR independent of scene lighting
    # — a facet can be shaded darker by the key/fill/rim lights for a 3D
    # read, but can never fall all the way to grey (too little light) or
    # blow out to white (too much), which is what happened when colour
    # depended entirely on light exposure — grey twice, blown white once.
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = 0.6
    bsdf.inputs["Emission Color"].default_value = rgba
    bsdf.inputs["Emission Strength"].default_value = 0.75
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.25
    return mat


def build_crane() -> bpy.types.Object:
    root = bpy.data.objects.new("CraneRoot", None)
    bpy.context.scene.collection.objects.link(root)

    materials = {k: make_material(k, v) for k, v in COLORS.items()}

    # Facets are positioned by their own 2D coords, then the whole assembly
    # is recentred — so compute a bounding centre first from raw points.
    all_pts = [p for _, pts, _, _ in FACETS for p in pts]
    cx = sum(p[0] for p in all_pts) / len(all_pts)
    cy = sum(p[1] for p in all_pts) / len(all_pts)

    for fname, pts, color_key, tilt_deg in FACETS:
        # Crane stands upright on the XZ plane (Blender Z is up), facing the
        # camera along +Y — not lying flat on the ground (X, Y, 0).
        verts = [((x - cx) * SCALE, 0.0, (cy - y) * SCALE) for x, y in pts]
        mesh = bpy.data.meshes.new(f"crane_{fname}")
        mesh.from_pydata(verts, [], [list(range(len(verts)))])
        mesh.update()

        obj = bpy.data.objects.new(f"crane_{fname}", mesh)
        obj.data.materials.append(materials[color_key])
        bpy.context.scene.collection.objects.link(obj)

        solid = obj.modifiers.new("Solidify", "SOLIDIFY")
        solid.thickness = 0.035
        solid.offset = 0

        obj.rotation_euler = (
            math.radians(tilt_deg[0]),
            math.radians(tilt_deg[1]),
            math.radians(tilt_deg[2]),
        )
        obj.parent = root

        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.shade_flat()
        obj.select_set(False)

    return root


# Exact page paper substrate (--surface-0 in globals.css), sRGB -> linear,
# so the baked background is pixel-for-pixel the page colour with no seam
# and the render needs no alpha channel (safer than relying on alpha-WebM
# browser support).
PAPER_BG = tuple((c / 255) ** 2.2 for c in (250, 249, 246)) + (1.0,)


def setup_world():
    # Ambient fill light — kept gentle, independent of the visible backdrop
    # colour (see build_backdrop). Coupling the two caused the crane to
    # blow out toward white the moment the backdrop got bright enough to
    # look like paper rather than a dim studio floor.
    world = bpy.data.worlds.new("Studio")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (1, 1, 1, 1)
    bg.inputs["Strength"].default_value = 0.12
    bpy.context.scene.world = world


def build_backdrop():
    # A large, unlit-flat plane standing in for the page's own paper colour
    # — a seamless-paper photography backdrop, not a light source. Emission
    # keeps its colour exact regardless of world/key/fill intensity.
    mat = bpy.data.materials.new("Backdrop")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    # Base Color black so the plane has zero diffuse response to the key/
    # fill/rim lights — those were adding on top of the emission colour and
    # clipping the backdrop to pure white regardless of what colour was set.
    # Emission alone, with no light contribution, is the only way to get an
    # exact, lighting-independent flat colour here.
    bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
    bsdf.inputs["Emission Color"].default_value = PAPER_BG
    bsdf.inputs["Emission Strength"].default_value = 1.0
    bsdf.inputs["Roughness"].default_value = 1.0

    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 4, 0))
    plane = bpy.context.active_object
    plane.rotation_euler = (math.radians(90), 0, 0)
    plane.data.materials.append(mat)
    plane.select_set(False)


def setup_lighting_and_camera(target: bpy.types.Object):
    key = bpy.data.lights.new("Key", type="AREA")
    key.energy = 180
    key.size = 5
    key_obj = bpy.data.objects.new("Key", key)
    key_obj.location = (4.2, -5.5, 5.5)
    key_obj.rotation_euler = (math.radians(52), 0, math.radians(35))
    bpy.context.scene.collection.objects.link(key_obj)

    fill = bpy.data.lights.new("Fill", type="AREA")
    fill.energy = 60
    fill.size = 6
    fill.color = (0.93, 0.95, 1.0)
    fill_obj = bpy.data.objects.new("Fill", fill)
    fill_obj.location = (-5, -3, 2.5)
    fill_obj.rotation_euler = (math.radians(70), 0, math.radians(-40))
    bpy.context.scene.collection.objects.link(fill_obj)

    rim = bpy.data.lights.new("Rim", type="AREA")
    rim.energy = 90
    rim.size = 4
    rim.color = (0.36, 0.24, 0.96)
    rim_obj = bpy.data.objects.new("Rim", rim)
    rim_obj.location = (-2, 5.5, 3)
    rim_obj.rotation_euler = (math.radians(-60), 0, math.radians(150))
    bpy.context.scene.collection.objects.link(rim_obj)

    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = 60
    cam_obj = bpy.data.objects.new("Cam", cam_data)
    cam_obj.location = (0, -9.5, 1.6)
    cam_obj.rotation_euler = (math.radians(84), 0, 0)
    bpy.context.scene.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    return cam_obj


def setup_render():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = RES
    scene.render.resolution_y = RES
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.eevee.use_raytracing = True
    scene.eevee.taa_render_samples = 24
    # AgX's filmic tone-mapping desaturates pastel material colours toward
    # grey exactly like a PBR material under weak lighting does (the same
    # failure already hit once in the Three.js version) — Standard reads
    # base colours close to true, which is what a flat paper graphic wants.
    scene.view_settings.view_transform = "Standard"


def main():
    clear_scene()
    setup_world()
    build_backdrop()
    root = build_crane()
    root.rotation_euler = (0, 0, math.radians(18))
    setup_lighting_and_camera(root)
    setup_render()

    scene = bpy.context.scene
    if HERO_ONLY:
        scene.render.filepath = f"{OUT}/crane_hero.png"
        bpy.ops.render.render(write_still=True)
        print(f"RENDERED {OUT}/crane_hero.png")
        return

    for i in range(FRAMES):
        root.rotation_euler = (0, 0, math.radians(18) + (2 * math.pi * i / FRAMES))
        scene.render.filepath = f"{OUT}/crane_{i:03d}.png"
        bpy.ops.render.render(write_still=True)
        print(f"RENDERED frame {i + 1}/{FRAMES}")


main()
