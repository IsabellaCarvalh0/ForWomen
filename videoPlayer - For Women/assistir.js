// Coloque aqui o link do YouTube de cada aula (watch?v=..., youtu.be/... ou embed/...)
  const lessons=[
    {t:'Introdução à Programação',y:'https://youtu.be/gMxQ8vxH9Vk?si=mN6VVb8IdJDIMMHu',i:'MA',p:'Marina Alves',m:16},
    {t:'Variáveis e Tipos de Dados',y:'https://youtu.be/FmTO2EPatZQ?si=Cp6LU0jKRc8qZZSS',i:'MA',p:'Marina Alves',m:18},
    {t:'Seletores CSS na Prática',y:'https://youtu.be/MLkMO-_gzGc?si=fThumGyf-1kz0kPX',i:'JS',p:'Juliana Souza',m:14},
    {t:'Flexbox do Zero',y:'https://youtu.be/Z4CbaGCEsTY?si=9wWUojOGQ7RBaD_I',i:'JS',p:'Juliana Souza',m:20},
    {t:'Layouts Responsivos',y:'https://youtu.be/2IV08sP9m3U?si=K2eevtm_-dK0FKCF',i:'JS',p:'Juliana Souza',m:19},
    {t:'Laços For e While',y:'https://youtu.be/n5ETibjJcAE?si=D5qHKjEnpXI2EGlm',i:'MA',p:'Marina Alves',m:18},
    {t:'List Comprehensions',y:'https://youtu.be/M2zL6LnQwkw?si=Waoi-CUMcD6dkSDr',i:'MA',p:'Marina Alves',m:21},
    {t:'Exercícios Práticos',y:'https://youtu.be/duOIpyQ7c84?si=mS7VYaix11dsI6V7',i:'MA',p:'Marina Alves',m:16},
    {t:'Primeiro projeto: Calculadora',y:'https://youtu.be/xsjPfMmWBxM?si=MVt6oKm9LaX-MTHA',i:'MA',p:'Marina Alves',m:45}
  ];
  const cur=Math.min(Math.max(parseInt(new URLSearchParams(location.search).get('aula'))||7,1),lessons.length);
  const L=lessons[cur-1], $=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');

  $('file').textContent='aula_'+pad(cur)+'.mp4';
  $('eyebrow').textContent='// aula '+cur+' de '+lessons.length;
  $('title').textContent='Aula '+cur+' — '+L.t;
  $('ini').textContent=L.i; $('inst').textContent=L.p;
  document.title='For Women — Aula '+cur;
  $('prog').textContent=(cur-1)+' de '+lessons.length+' concluídas';
  $('trackfill').style.width=((cur-1)/lessons.length*100)+'%';

  $('list').innerHTML=lessons.map((l,i)=>{
    const n=i+1, c=n<cur?'done':n===cur?'current':'';
    return `<div class="item ${c}" onclick="location.href='assistir.html?aula=${n}'"><div class="num">${n<cur?'✓':n}</div><div><div class="item-title">${l.t}</div><div class="item-min">${l.m} min</div></div></div>`;
  }).join('');

  $('prev').style.visibility=cur>1?'visible':'hidden';
  $('next').style.visibility=cur<lessons.length?'visible':'hidden';
  $('prev').onclick=()=>location.href='assistir.html?aula='+(cur-1);
  $('next').onclick=()=>location.href='assistir.html?aula='+(cur+1);

  function ytId(u){
    const m=(u||'').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    return m?m[1]:null;
  }
  const id=ytId(L.y);
  $('screen').innerHTML=id
    ? `<iframe src="https://www.youtube.com/embed/${id}?rel=0" title="Aula ${cur}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
    : `<div class="empty"><svg width="56" height="56" viewBox="0 0 24 24" fill="#fff"><polygon points="6 3 20 12 6 21 6 3"/></svg><p class="mono">// video_aula_${pad(cur)}.youtube<br>o link do YouTube desta aula ainda não foi adicionado</p></div>`;

  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
    document.querySelectorAll('.tab,.panel').forEach(e=>e.classList.remove('active'));
    t.classList.add('active'); $(t.dataset.tab).classList.add('active');
  });