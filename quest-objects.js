// The DOM supplies readable math and keyboard/touch targets. Three.js meshes are
// aligned with those targets using the camera projection, including after resize.
export function createQuestObjects(THREE, pack, question, parent) {
  const sea = pack === "fractions";
  const palette = sea ? [0xff9272, 0x6cefd5, 0xf3c751, 0xae91ff] : [0x7491ff, 0xb183f4, 0x64e1e8, 0xf5a66e];
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: .66 });
  function mesh(group, geometry, color, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, material(color));
    object.position.set(x, y, z);
    group.add(object);
    return object;
  }
  const ball = (group, radius, color, x, y, z) =>
    mesh(group, new THREE.SphereGeometry(radius, 14, 10), color, x, y, z);
  const ring = (group, radius, color, x, y, z) =>
    mesh(group, new THREE.TorusGeometry(radius, .024, 6, 28), color, x, y, z);

  const carriers = palette.map(color => {
    const anchor = new THREE.Group();
    const creature = new THREE.Group();
    anchor.add(creature);
    parent.add(anchor);
    const body = ball(creature, .49, color, 0, 0, 0);
    let tail;
    if (sea) {
      body.scale.set(1.10, .73, .64);
      tail = mesh(creature, new THREE.ConeGeometry(.28, .5, 3), color, -.56, -.01, 0);
      tail.rotation.z = -Math.PI / 2;
      const fin = ball(creature, .22, color, .02, .3, -.07);
      fin.scale.set(.76, .96, .25);
      ball(creature, .13, 0xfff4dd, .19, .08, .28);
      ball(creature, .063, 0x142f4b, .22, .08, .39);
      ball(creature, .078, 0xffdfaf, .36, -.08, .24);
    } else {
      const orbit = ring(creature, .63, color, 0, 0, 0);
      orbit.rotation.set(.97, 0, .36);
      const band = ring(creature, .42, 0xe5daff, 0, 0, .06);
      band.rotation.x = 1.25;
      ball(creature, .12, 0xffe7cb, -.49, .34, .19);
    }
    const halo = ring(anchor, .72, 0xf2ff9e, 0, 0, -.16);
    halo.visible = false;
    return { anchor, creature, tail, halo, body, result: null, reactedAt: 0 };
  });

  const equation = new THREE.Group();
  parent.add(equation);
  const tiles = sea ? 8 : 6;
  for (let i = 0; i < tiles; i++) {
    const tile = mesh(equation, new THREE.CylinderGeometry(.42,.32,.15, 6),
      i % 2 ? palette[1] : palette[0], (i - (tiles - 1) / 2) * .72, 0, 0);
    tile.rotation.x = .64;
  }

  const demo = new THREE.Group();
  parent.add(demo);
  const moving = [];
  let showModels = () => {};
  if (sea) {
    // Color represents the numerator; each shell is one equal part of the whole.
    const shells = [];
    for (let i = 0; i < (question.id==="f3"?8:4); i++) {
      const shell = new THREE.Group();
      shell.position.set((i % 4 - 1.5) * .47, .32, 0);
      demo.add(shell);
      for (let fan = -1; fan <= 1; fan++) {
        const ridge = ball(shell, .18, 0x647fa4, fan * .064, .03, 0);
        ridge.scale.set(.43, 1, .47);
        ridge.rotation.z = -fan * .48;
      }
      shells.push(shell);
    }
    function shade(shell,color) {
      for (const ridge of shell.children) ridge.material.color.setHex(color);
    }
    function model(expanded,answered=false) {
      shells.forEach((shell,index)=>{
        shell.visible=index<4||expanded;
        shell.position.y=expanded?(index<4?.31:-.22):.02;
        const numerator=question.id==="f3"?(expanded?6:3):question.id==="f1"&&answered?3:2;
        const highlighted=expanded?index%4<3:index<numerator;
        shade(shell,highlighted?0xffce6d:0x647fa4);
      });
    }
    model(false);
    showModels = answered => model(question.id==="f3",answered);
  } else {
    // All three simplified expressions are lines. A removable hole appears
    // only for the rational expressions; the dots never reach that hole.
    const { target, value, slope, hole } = {
      l1: { target: 2, value: 4, slope: 1, hole: true },
      l2: { target: 3, value: 6, slope: 1, hole: true },
      l3: { target: 1, value: 5, slope: 3, hole: false },
    }[question.id];
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const x = u => 197 + u * 65;
    const y = u => 122 - u * slope * 19;
    ctx.fillStyle = "#101636";
    ctx.beginPath();ctx.roundRect(0,0,384,256,25);ctx.fill();
    ctx.strokeStyle = "#465380";ctx.lineWidth = 1;
    for (let col = 37; col < 384; col += 40) { ctx.beginPath();ctx.moveTo(col,20);ctx.lineTo(col,230);ctx.stroke(); }
    for (let row = 42; row < 240; row += 40) { ctx.beginPath();ctx.moveTo(22,row);ctx.lineTo(360,row);ctx.stroke(); }
    ctx.setLineDash([6,6]);ctx.strokeStyle = "#c3b9ff";
    ctx.beginPath();ctx.moveTo(x(0),25);ctx.lineTo(x(0),223);ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle = "#81edf0";ctx.lineWidth = 5;
    ctx.beginPath();ctx.moveTo(x(-1.6),y(-1.6));ctx.lineTo(x(1.6),y(1.6));ctx.stroke();
    ctx.beginPath();ctx.arc(x(0),y(0),8,0,Math.PI*2);ctx.fillStyle=hole?"#101636":"#81edf0";ctx.fill();ctx.stroke();
    const digit = n => "٠١٢٣٤٥٦٧٨٩"[n];
    ctx.fillStyle="#f0ebff";ctx.font="25px Arial";ctx.textAlign="center";
    ctx.fillText("س = "+digit(target),x(0),247);
    ctx.fillText("د(س)",37,30);
    ctx.fillText("س",359,231);
    // Coordinates are local to the target. Label nearby values without
    // printing the limit at the hole.
    for(const offset of [-1,1]){
      ctx.fillText(digit(target+offset),x(offset),247);
      ctx.fillText(digit(value+offset*slope),34,y(offset)+7);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const graph = new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.73),new THREE.MeshBasicMaterial({
      map:texture, transparent:true,
    }));
    demo.add(graph);
    for (const sign of [-1, 1]) {
      const dot = ball(demo,.057,sign < 0 ? 0xffd476 : 0xfba1dc,0,0,.04);
      moving.push({ dot, sign, x, y });
    }
  }
  return { carriers, equation, demo, moving, showModels };
}

export function animateQuestObjects(objects, seconds, reduced) {
  const phase = reduced ? .52 : (seconds % 4.2) / 4.2;
  for (const { dot, sign, x, y } of objects.moving) {
    const sample = sign * (1.45 * (1 - phase) ** 2 + .17);
    dot.position.set((x(sample)/384-.5)*2.6,(.5-y(sample)/256)*1.73,.04);
  }
  objects.carriers.forEach(({ creature, tail, result, reactedAt }, index) => {
    if (reduced) return;
    const offset = seconds * 2.4 + index * 1.2;
    const pulse = Math.max(0, 1 - (seconds - reactedAt));
    creature.position.y = Math.sin(offset) * .09 + (result === true ? pulse * .32 : 0);
    creature.position.x = result === false ? Math.sin(pulse * 23) * pulse * .18 : 0;
    creature.rotation.y = Math.sin(offset * .7) * .19;
    if (tail) tail.rotation.y = Math.sin(offset * 2) * .48;
  });
}
