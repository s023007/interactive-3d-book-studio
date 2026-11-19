const numbers = new Intl.NumberFormat("ar-OM", {numberingSystem: "arab"});
const n = value => numbers.format(value);
const relation = ["متوازيان", "متعامدان", "متقاطعان بزاوية غير قائمة"];
const triangles = ["متساوي الأضلاع", "متساوي الساقين", "مختلف الأضلاع"];
const point = ([x,y]) => "(" + n(x) + "، " + n(y) + ")";
const line = (type, side = 1) => ({
  kind: "lines",
  type,
  side,
  controls: [
    {label: "مدّ العارضتين", note: "تتبّع اتجاه العارضتين بعد مدّهما."},
    {label: "ضع زاوية القياس", note: type === "parallel"
      ? "قارن المسافة بين العارضتين عند طرفيهما."
      : "ضع حافة زاوية القياس على العارضة الذهبية. هل تقع العارضة الزرقاء على حافتها الثانية؟"},
  ],
});
const triangle = lengths => ({
  kind: "triangle",
  lengths,
  controls: lengths.map((length,i) => ({
    label: ["قس الضلع الأول", "قس الضلع الثاني", "قس الضلع الثالث"][i],
    note: "طول الضلع " + ["الأول", "الثاني", "الثالث"][i] + " يساوي " + n(length) + " وحدات.",
  })),
});
const grid = target => ({
  kind: "coordinates",
  target,
  controls: [
    {label: "تتبّع س", note: "من نقطة الأصل، تحرّك أفقيًا حتى تصبح تحت العلامة."},
    {label: "تتبّع ص", note: "ثم تحرّك عموديًا حتى تصل إلى العلامة. اقرأ س قبل ص."},
  ],
});
const transform = (type, axis = "vertical", change = [2,1]) => ({
  kind: "transform",
  type, axis, change,
  controls: [
    {label: type === "slide" ? "حرّك القطعة" : "أظهر الصورة",
     note: type === "slide" ? "راقب الرأس المعلّم. تحرّك مع بقية القطعة في الاتجاه نفسه." :
       "تظهر الصورة على الجهة الأخرى من المحور. تتبّع الرأس المعلّم في الشكل والصورة."},
    {label: type === "slide" ? "تتبّع الحركة" : "قس المسافتين",
     note: type === "slide" ? "عدّ المربعات على السهم الأفقي ثم السهم العمودي." :
       "عدّ المربعات من كل رأس معلّم إلى المحور. هل العدد متساوٍ؟"},
  ],
});

const linePages = [
  {label:"اكتشف", title:"عارضتان في المسار", lab:line("parallel"),
   task:"مدّ العارضتين، ثم افحص الفراغ بينهما عند الطرفين.",
   question:"استمرت العارضتان في الاتجاه نفسه. ما العلاقة بينهما؟",
   items:relation, answer:0, hint:"قارن عرض الفراغ بين العارضتين عند طرفيه.",
   explain:"تبقى المسافة ثابتة بين الخطين المتوازيين، ولا يلتقيان مهما امتدا."},
  {label:"جرّب", title:"مفترق الجسر", lab:line("right"),
   task:"ضع زاوية القياس على نقطة الالتقاء.",
   question:"ما علاقة العارضتين عند هذا المفترق؟",
   items:relation, answer:1, hint:"التقاء الخطين وحده لا يكفي. افحص زاوية الالتقاء.",
   explain:"تطابق العارضتان حافتي الزاوية القائمة. الخطان المتعامدان يلتقيان بزاوية قائمة.",
   retry:{question:"في المفترق الجديد، ما العلاقة بين الخطين؟", lab:line("oblique",-1), items:relation, answer:2}},
  {label:"طبّق", title:"مفترق مائل", lab:line("oblique"),
   task:"جرّب زاوية القياس، وتحقق من اتجاه الحافة الثانية.",
   question:"هل يكفي أن تلتقي العارضتان حتى تكونا متعامدتين؟",
   items:["نعم، لأنهما تتقاطعان", "لا، زاوية التقاطع غير قائمة", "فتحة التقاطع تدلّ على التوازي"], answer:1,
   hint:"إحدى العارضتين مائلة عن حافة زاوية القياس.",
   explain:"العارضتان تتقاطعان، لكن زاوية التقاطع ليست قائمة. لذلك فهما غير متعامدتين.",
   retry:{question:"كم زاوية قائمة يكوّنها هذان الخطان عند التقاطع؟", lab:line("right"), items:["صفر", "زاويتان", "أربع زوايا"], answer:2}},
];

const trianglePages = [
  {label:"اكتشف", title:"مقارنة أضلاع المثلث", lab:triangle([4,4,4]),
   task:"استخدم المسطرة لقياس الأضلاع الثلاثة.",
   question:"أي اسم يناسب هذا المثلث حسب أطوال أضلاعه؟",
   items:triangles, answer:0, hint:"قِس الأضلاع الثلاثة. هل تظهر القيمة نفسها كل مرة؟",
   explain:"الأضلاع الثلاثة طول كل منها ٤ وحدات، لذلك فهو متساوي الأضلاع."},
  {label:"جرّب", title:"ساقا المثلث", lab:triangle([6,5,5]),
   task:"قارن طولي الضلعين الجانبيين بطول القاعدة.",
   question:"ما تصنيف المثلث إذا تساوى ضلعان واختلف الثالث؟",
   items:triangles, answer:1, hint:"ابحث عن القياس الذي يظهر مرتين.",
   explain:"طول كل من الساقين ٥ وحدات، وطول القاعدة ٦ وحدات. هذا المثلث متساوي الساقين.",
   retry:{question:"ماذا تسمّي المثلث الجديد بعد قياس أضلاعه؟", lab:triangle([5,3,4]), items:triangles, answer:2}},
  {label:"طبّق", title:"تصنيف مثلث جديد", lab:triangle([6,4,5]),
   task:"قِس الأضلاع، واستعمل القياسات الثلاثة في قرارك.",
   question:"ما نوع المثلث وفق أطوال أضلاعه؟",
   items:triangles, answer:2, hint:"حاول العثور على ضلعين لهما الطول نفسه.",
   explain:"الأطوال ٦ و٤ و٥ وحدات. لكل ضلع طول مختلف، فهو مثلث مختلف الأضلاع.",
   retry:{question:"ما تصنيف المثلث الجديد بعد قياس أضلاعه؟", lab:triangle([5,5,5]), items:triangles, answer:0}},
];

const coordinatePages = [
  {label:"اكتشف", title:"خطوتان من نقطة الأصل", lab:grid([3,2]),
   task:"تتبّع س أفقيًا أولًا، ثم ص عموديًا.",
   question:"ما الزوج المرتب عند العلامة الذهبية؟",
   items:[[2,3],[3,2],[3,3]].map(point), answer:1, hint:"س تقيس الحركة الأفقية، وهي أول عدد في الزوج.",
   explain:"نقطع ٣ وحدات أفقيًا، ثم وحدتين عموديًا. س تساوي ٣، وص تساوي ٢."},
  {label:"جرّب", title:"علامة فوق المحور", lab:grid([0,4]),
   task:"تتبّع مكان العلامة من نقطة الأصل.",
   question:"ما إحداثيا العلامة التي تظهر على المحور الصادي؟",
   items:[[0,4],[4,0],[1,4]].map(point), answer:0, hint:"هل تحتاج إلى حركة أفقية لتقف تحت العلامة؟",
   explain:"تبقى على المحور الصادي دون حركة أفقية، لذا س تساوي صفرًا وص تساوي ٤.",
   retry:{question:"ما إحداثيا العلامة الجديدة على المحور السيني؟", lab:grid([4,0]), items:[[0,4],[4,1],[4,0]].map(point), answer:2}},
  {label:"طبّق", title:"الترتيب يصنع الفرق", lab:grid([2,5]),
   task:"اقرأ س أولًا، ثم ص. قارن ترتيب العددين في الخيارات.",
   question:"أي زوج يقود الراكون إلى العلامة الذهبية؟",
   items:[[5,2],[2,4],[2,5]].map(point), answer:2, hint:"عدّ عمودين من نقطة الأصل قبل قراءة الصف.",
   explain:"العلامة في العمود الثاني والصف الخامس. س تساوي ٢، وص تساوي ٥.",
   retry:{question:"كيف تكتب إحداثيي العلامة الجديدة؟", lab:grid([4,1]), items:[[4,1],[1,4],[4,2]].map(point), answer:0}},
];

const movement = ["انسحاب", "انعكاس", "دوران"];
const transformPages = [
  {label:"اكتشف", title:"حرّك القطعة الورقية", lab:transform("slide"),
   task:"حرّك القطعة ثم قارن اتجاهها باتجاه موضعها الأول.",
   question:"ما التحويل عندما تنتقل القطعة كلها ويبقى اتجاهها كما هو؟",
   items:movement, answer:0, hint:"تتبّع الرأس المعلّم في الشكل الأول وصورته.",
   explain:"تحرّكت كل نقطة وحدتين يمينًا ووحدة إلى الأعلى وبقي اتجاه القطعة كما هو. هذا انسحاب."},
  {label:"جرّب", title:"على جانبي المرآة", lab:transform("mirror"),
   task:"أظهر الصورة ثم قس بُعد الرأس المعلّم عن المحور على الجانبين.",
   question:"يبعد الرأس المعلّم وحدتين عن محور المرآة. كم تبعد صورته عنه؟",
   items:["وحدة واحدة", "وحدتان", "أربع وحدات"], answer:1, hint:"قارن عدد المربعات بين المحور وكل علامة ذهبية.",
   explain:"المحور في المنتصف. يقع الرأس وصورته في جهتين متقابلتين على البعد نفسه.",
   retry:{question:"في المرآة الأفقية الجديدة، ما بعد الصورة المعلّمة عن المحور؟", lab:transform("mirror","horizontal"),
     items:["أربع وحدات", "وحدة واحدة", "وحدتان"], answer:2}},
  {label:"طبّق", title:"اختر التحويل", lab:transform("mirror","horizontal"),
   task:"أظهر الصورة وتتبع اتجاه رأس القطعة.",
   question:"ما التحويل الذي أنتج هذه الصورة على الجهة الأخرى من المحور؟",
   items:movement, answer:1, hint:"قارن اتجاه رأس القطعة والمسافة إلى خط المرآة على الجانبين.",
   explain:"الصورة معكوسة حول محور أفقي. كل نقطة وصورتها على البعد نفسه من المحور.",
   retry:{question:"ما التحويل في المثال الجديد؟", lab:transform("slide","vertical",[3,0]), items:movement, answer:0}},
];

function route(theme,mapTitle,mapTask,stamp,labels,activities) {
  return {
    theme, mapTitle, mapTask, stamp,
    mapTip:"يمكنك تجربة أي محطة. أكمل «جرّب» و«طبّق» لتحصل على الختم.",
    masteryPages:[1,2],
    doors:labels.map((label,page)=>({label,page})),
    pages:[
      ...activities,
      {label:"الإنجاز", title:stamp, question:"أكملت محطتي التدريب والتطبيق.",
       task:"حُفظ الختم في فهرس الدرس. يمكنك العودة إلى خريطته ومراجعة أي محطة.",
       lab:activities[2].lab, celebration:true},
    ],
  };
}

export const geometryLessons = {
  "٥–١": route("lines","معابر الخطوط","اختبر مسارات الجسر","مستكشف الخطوط",
    ["العارضتان", "مفترق الجسر", "المفترق المائل"],linePages),
  "٥–٢": route("triangle","ورش المثلثات","قِس أضلاع المثلثات","خبير الأضلاع",
    ["ورشة القياس", "ورشة الساقين", "ورشة التصنيف"],trianglePages),
  "٦–١": route("coordinates","شبكة الإحداثيات","اعثر على النقاط في شبكة الكتاب","مستكشف الإحداثيات",
    ["نقطة البداية", "علامة المحور", "الموقع الجديد"],coordinatePages),
  "٦–٢": route("transform","مسار الحركة والمرآة","تتبّع موضع القطعة وصورتها","دليل التحويلات",
    ["مسار الحركة", "مرآة الصفحة", "درب التحويل"],transformPages),
};

const svgNS = "http://www.w3.org/2000/svg";

export function renderDiagram(figure,diagram) {
  const svg = document.createElementNS(svgNS,"svg");
  svg.setAttribute("viewBox","-0.35 -0.35 6.7 6.7");
  svg.setAttribute("role","img");
  svg.setAttribute("aria-label",diagram.description);
  function draw(tag,values,text) {
    const element = document.createElementNS(svgNS,tag);
    for(const [name,value] of Object.entries(values))element.setAttribute(name,value);
    if(text)element.textContent=text;
    svg.append(element);
  }
  for(const {points,fill} of diagram.shapes){
    draw("polygon",{points:points.map(([x,y])=>x+","+(6-y)).join(" "),fill,opacity:.44});
  }
  for(const {from:[x1,y1],to:[x2,y2],color,width} of diagram.segments){
    draw("line",{x1,y1:6-y1,x2,y2:6-y2,stroke:color,"stroke-width":width,"stroke-linecap":"round"});
  }
  for(const {at:[x,y],color,radius} of diagram.markers){
    draw("circle",{cx:x,cy:6-y,r:radius,fill:color,stroke:"#fff7e3","stroke-width":.04});
  }
  for(const {at:[x,y],text,color} of diagram.labels){
    draw("text",{x,y:6-y,fill:color,"font-size":.37,"font-weight":"bold","text-anchor":"middle","dominant-baseline":"middle"},text);
  }
  figure.replaceChildren(svg);
}
