"""Builds the prompt2md crane as a real 3D papercraft mesh and renders a
turntable sequence. Run headless:

  blender --background --factory-startup --python blender/build_crane.py -- \
      --frames 48 --res 720 --out blender/render --hero-only

GEOMETRY IS GENUINE 3D CRANE ANATOMY, not the flat mark extruded. The first
version mapped icon.svg's 2D facets onto near-coplanar panels with small
tilts; that renders fine head-on but collapses to a near-invisible sliver at
90 degrees, which is fatal for a turntable. Here the crane is built the way a
folded orizuru actually is: a centre keel running front-to-back, wings
spreading out to both sides with dihedral, neck rising forward, tail rising
back — so there is real volume on every axis and no viewing angle degenerates.

Only the LEFT half is defined; a Mirror modifier produces the right. That
guarantees the bilateral symmetry real origami has (and halves the vertex
bookkeeping). Coordinates: X right, +Y back, Z up.

The side-on view still reads as the flat brand mark — neck up-forward, tail
low-back, wing peak above the body — because that is what a real crane looks
like in profile, which is what the icon was drawn from in the first place.
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
START_ANGLE = float(arg("--start-angle", "55"))
SPIN = "--spin" in ARGV
SWING_CENTER = float(arg("--swing-center", "85"))
SWING_AMP = float(arg("--swing-amp", "50"))

# Left half only (X <= 0); mirrored across X at build time. Each entry is
# (name, polygon vertices in order around the perimeter, material key).
FACETS = [
    # Belly panel: rises from the centre keel line out to the wing root.
    (
        "body",
        [(0, -1.75, -0.95), (0, 1.75, -0.95), (-1.05, 1.35, 0.35), (-1.05, -1.35, 0.35)],
        "lavender",
    ),
    # Wing: root edge along the body top, sweeping out and UP (dihedral is
    # what keeps the front view from reading as a flat plate).
    (
        "wing",
        [(-1.05, -1.35, 0.35), (-1.05, 1.35, 0.35), (-3.35, 0.05, 1.85)],
        "white",
    ),
    # Neck: a narrow panel whose mirror forms a V opening backward, so the
    # neck has thickness from every angle rather than vanishing edge-on.
    (
        "neck",
        [(0, -1.62, -0.30), (-0.42, -1.40, 0.02), (-0.20, -2.86, 1.76), (0, -3.02, 1.90)],
        "white",
    ),
    # Beak: the single ink accent, and the detail that says "crane" instantly.
    (
        "beak",
        [(0, -3.02, 1.90), (0, -3.88, 1.56), (-0.17, -2.92, 1.74)],
        "ink",
    ),
    # Tail: same V construction as the neck, rising back.
    (
        "tail",
        [(0, 1.62, -0.28), (-0.45, 1.42, 0.06), (-0.28, 3.05, 1.32), (0, 3.25, 1.45)],
        "lavender",
    ),
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

    for fname, verts, color_key in FACETS:
        mesh = bpy.data.meshes.new(f"crane_{fname}")
        mesh.from_pydata([tuple(v) for v in verts], [], [list(range(len(verts)))])
        mesh.update()

        obj = bpy.data.objects.new(f"crane_{fname}", mesh)
        obj.data.materials.append(materials[color_key])
        bpy.context.scene.collection.objects.link(obj)

        # Paper thickness — thin enough to read as a sheet, thick enough that
        # an edge-on facet is still a visible line rather than nothing.
        solid = obj.modifiers.new("Solidify", "SOLIDIFY")
        solid.thickness = 0.05
        solid.offset = 0

        # The right half of the bird. Merge welds the verts that sit exactly
        # on the X=0 centre line (neck, beak, tail ridges) so the mirrored
        # halves join into one continuous fold instead of two touching shells.
        mirror = obj.modifiers.new("Mirror", "MIRROR")
        mirror.use_axis[0] = True
        mirror.use_mirror_merge = True
        mirror.merge_threshold = 0.001

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

    bpy.ops.mesh.primitive_plane_add(size=90, location=(0, 12, 0))
    plane = bpy.context.active_object
    plane.rotation_euler = (math.radians(90), 0, 0)
    plane.data.materials.append(mat)
    plane.select_set(False)


def setup_lighting_and_camera(target: bpy.types.Object):
    # Three-point setup scaled for a bird roughly 7 units across. Energies
    # only shape the facets; the emission floor in make_material owns colour.
    key = bpy.data.lights.new("Key", type="AREA")
    key.energy = 900
    key.size = 8
    key_obj = bpy.data.objects.new("Key", key)
    key_obj.location = (6.0, -8.0, 8.0)
    key_obj.rotation_euler = (math.radians(50), 0, math.radians(37))
    bpy.context.scene.collection.objects.link(key_obj)

    fill = bpy.data.lights.new("Fill", type="AREA")
    fill.energy = 320
    fill.size = 10
    fill.color = (0.93, 0.95, 1.0)
    fill_obj = bpy.data.objects.new("Fill", fill)
    fill_obj.location = (-7.5, -5.0, 3.0)
    fill_obj.rotation_euler = (math.radians(72), 0, math.radians(-42))
    bpy.context.scene.collection.objects.link(fill_obj)

    # A violet rim from behind picks the silhouette off the paper and ties
    # the object to the brand accent without tinting the paper facets.
    rim = bpy.data.lights.new("Rim", type="AREA")
    rim.energy = 500
    rim.size = 6
    rim.color = (0.36, 0.24, 0.96)
    rim_obj = bpy.data.objects.new("Rim", rim)
    rim_obj.location = (-3.0, 7.5, 4.5)
    rim_obj.rotation_euler = (math.radians(-58), 0, math.radians(152))
    bpy.context.scene.collection.objects.link(rim_obj)

    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = 55
    cam_obj = bpy.data.objects.new("Cam", cam_data)
    cam_obj.location = (0, -13.5, 2.6)
    cam_obj.rotation_euler = (math.radians(81), 0, 0)
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
    # 24 left visible stair-stepping on the long diagonal wing edges, which
    # is the most conspicuous flaw at hero size on a flat-colour backdrop.
    scene.eevee.taa_render_samples = 64
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
    setup_lighting_and_camera(root)
    setup_render()

    scene = bpy.context.scene

    # At Z=0 the neck points straight at the camera; START_ANGLE opens that
    # to a three-quarter view, which shows wing spread and neck length at
    # once and is the pose the poster frame lands on.
    if HERO_ONLY:
        for a in [float(x) for x in arg("--angles", "55").split(",")]:
            root.rotation_euler = (0, 0, math.radians(a))
            scene.render.filepath = f"{OUT}/crane_a{int(a):03d}.png"
            bpy.ops.render.render(write_still=True)
            print(f"RENDERED angle {a}")
        return

    for i in range(FRAMES):
        t = i / FRAMES
        if SPIN:
            angle = START_ANGLE + 360.0 * t
        else:
            # Oscillation, not a full spin. A crane's wings lie in planes
            # containing its front-back axis, so a full turntable passes
            # through two dead angles (head-on and tail-on) where the wings
            # go edge-on and the lavender body is fully occluded — it reads
            # as a dart, not a bird. Swinging between two good three-quarter
            # views shows the depth without ever hitting those. sin() also
            # eases at both extremes for free and loops seamlessly.
            angle = SWING_CENTER + SWING_AMP * math.sin(2 * math.pi * t)
        root.rotation_euler = (0, 0, math.radians(angle))
        scene.render.filepath = f"{OUT}/crane_{i:03d}.png"
        bpy.ops.render.render(write_still=True)
        print(f"RENDERED frame {i + 1}/{FRAMES}")


main()
