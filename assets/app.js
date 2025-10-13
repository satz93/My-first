// Minimal client-side helpers for navigation and demo state
(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // Fake bank detection by filename keywords
  const detectBank = (name) => {
    const map = [
      [/hdfc/i,'HDFC'],[/icici/i,'ICICI'],[/sbi/i,'SBI'],[/axis/i,'AXIS'],[/kotak/i,'KOTAK']
    ];
    for(const [re, bank] of map){ if(re.test(name)) return bank; }
    return 'Unknown';
  };

  // Upload page behavior
  if(document.body.dataset.page === 'upload'){
    const dz = $('.dropzone');
    const fileInput = $('#fileInput');
    const fileList = $('#fileList');
    const analyzeBtn = $('#analyzeBtn');
    const steps = $$('.step');

    const addFiles = (files) => {
      const items = Array.from(files);
      const stored = JSON.parse(localStorage.getItem('spendwise:selectedFiles')||'[]');
      for(const f of items){
        stored.push({name:f.name,size:f.size,bank:detectBank(f.name)});
      }
      localStorage.setItem('spendwise:selectedFiles', JSON.stringify(stored));
      renderList();
    };

    const renderList = () => {
      const stored = JSON.parse(localStorage.getItem('spendwise:selectedFiles')||'[]');
      fileList.innerHTML = stored.map((f,i)=>
        `<div class="file-item"><div><strong>${f.name}</strong><div class="muted">${(f.size/1024).toFixed(1)} KB</div></div><span class="badge">${f.bank}</span></div>`
      ).join('') || '<div class="muted">No files selected yet.</div>';
      analyzeBtn.disabled = stored.length === 0;
    };

    dz.addEventListener('click',()=> fileInput.click());
    dz.addEventListener('dragover',(e)=>{e.preventDefault(); dz.style.borderColor = 'var(--brand)';});
    dz.addEventListener('dragleave',()=> dz.style.borderColor = '#cbd5e1');
    dz.addEventListener('drop',(e)=>{ e.preventDefault(); dz.style.borderColor = '#cbd5e1'; addFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change',()=> addFiles(fileInput.files));

    const setStep = (idx,state) => {
      steps[idx].classList.remove('active','done');
      if(state==='active') steps[idx].classList.add('active');
      if(state==='done') steps[idx].classList.add('done');
    };

    analyzeBtn?.addEventListener('click', async ()=>{
      // Simulate pipeline
      setStep(0,'active'); await new Promise(r=>setTimeout(r,600)); setStep(0,'done');
      setStep(1,'active'); await new Promise(r=>setTimeout(r,600)); setStep(1,'done');
      setStep(2,'active'); await new Promise(r=>setTimeout(r,600)); setStep(2,'done');
      setStep(3,'active'); await new Promise(r=>setTimeout(r,600)); setStep(3,'done');

      // Create demo dashboard data
      const files = JSON.parse(localStorage.getItem('spendwise:selectedFiles')||'[]');
      const banks = [...new Set(files.map(f=>f.bank))];
      const categories = ['Food','Travel','Shopping','Bills','Entertainment','Other'];

      const tx = Array.from({length: 40}, (_,i)=>{
        const bank = banks[i % banks.length] || 'HDFC';
        const category = categories[Math.floor(Math.random()*categories.length)];
        const amount = Math.floor(Math.random()*5000)+200;
        const date = new Date(); date.setDate(date.getDate()-Math.floor(Math.random()*60));
        return {date: date.toISOString().slice(0,10), bank, description: `${category} purchase`, amount, category};
      });

      localStorage.setItem('spendwise:data', JSON.stringify({transactions: tx}));
      window.location.href = 'dashboard.html';
    });

    renderList();
  }

  // Dashboard behavior
  if(document.body.dataset.page === 'dashboard'){
    const data = JSON.parse(localStorage.getItem('spendwise:data')||'{"transactions":[]}');
    const transactions = data.transactions || [];

    const monthSelect = $('#filterMonth');
    const bankSelect = $('#filterBank');
    const categorySelect = $('#filterCategory');

    const renderFilters = () => {
      const banks = [...new Set(transactions.map(t=>t.bank))];
      bankSelect.innerHTML = '<option value="all">All Banks</option>' + banks.map(b=>`<option>${b}</option>`).join('');
      const cats = [...new Set(transactions.map(t=>t.category))];
      categorySelect.innerHTML = '<option value="all">All Categories</option>' + cats.map(c=>`<option>${c}</option>`).join('');
    };

    const formatCurrency = (n) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);

    const filteredTx = () => {
      let list = [...transactions];
      // Month filter: current or all
      const m = monthSelect.value;
      if(m !== 'all'){
        const monthIndex = parseInt(m,10);
        list = list.filter(t=> new Date(t.date).getMonth() === monthIndex);
      }
      if(bankSelect.value !== 'all') list = list.filter(t=> t.bank === bankSelect.value);
      if(categorySelect.value !== 'all') list = list.filter(t=> t.category === categorySelect.value);
      return list;
    };

    const renderStats = () => {
      const list = filteredTx();
      const total = list.reduce((s,t)=>s+t.amount,0);
      $('#statTotal').textContent = formatCurrency(total);

      // Biggest category
      const byCat = list.reduce((m,t)=>{m[t.category]=(m[t.category]||0)+t.amount; return m;},{})
      let biggestCat = 'N/A', biggestVal = 0;
      for(const [k,v] of Object.entries(byCat)){ if(v>biggestVal){biggestCat=k;biggestVal=v;} }
      $('#statBiggestCat').textContent = biggestCat;

      // Top bank
      const byBank = list.reduce((m,t)=>{m[t.bank]=(m[t.bank]||0)+t.amount; return m;},{})
      let topBank='N/A', topVal=0; for(const [k,v] of Object.entries(byBank)){ if(v>topVal){topBank=k;topVal=v;} }
      $('#statTopBank').textContent = topBank;

      // Change vs last month (mock based on ratio)
      const lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth()-1);
      const lm = lastMonth.getMonth();
      const lastMonthTotal = transactions.filter(t=> new Date(t.date).getMonth()===lm).reduce((s,t)=>s+t.amount,0);
      const change = lastMonthTotal ? ((total - lastMonthTotal)/lastMonthTotal)*100 : 0;
      const el = $('#statChange');
      el.textContent = (change>=0?'+':'') + Math.round(change) + '%';
      el.style.color = change>=0 ? '#dc2626' : '#16a34a';
    };

    const renderTable = () => {
      const tbody = $('#txBody');
      const list = filteredTx();
      tbody.innerHTML = list.map((t,i)=>
        `<tr>
          <td>${t.date}</td>
          <td>${t.bank}</td>
          <td>${t.description}</td>
          <td>${formatCurrency(t.amount)}</td>
          <td>
            <select data-index="${i}" class="select select-cat">
              ${[...new Set(transactions.map(x=>x.category))].map(c=>`<option ${t.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </td>
        </tr>`
      ).join('');

      $$('.select-cat').forEach(sel=>{
        sel.addEventListener('change', (e)=>{
          const idx = parseInt(e.target.dataset.index,10);
          const list = filteredTx();
          const tx = list[idx];
          if(!tx) return;
          tx.category = e.target.value;
          localStorage.setItem('spendwise:data', JSON.stringify({transactions}));
          renderStats();
        });
      });
    };

    const renderCharts = () => {
      // Simple inline charts using Chart.js CDN for visual polish
      if(typeof Chart === 'undefined') return;
      const list = filteredTx();
      const byCat = {};
      const byBank = {};
      const byMonth = new Array(12).fill(0);
      for(const t of list){
        byCat[t.category]=(byCat[t.category]||0)+t.amount;
        byBank[t.bank]=(byBank[t.bank]||0)+t.amount;
        byMonth[new Date(t.date).getMonth()] += t.amount;
      }

      const pieCtx = document.getElementById('pieCat');
      const barCtx = document.getElementById('barBank');
      const lineCtx = document.getElementById('lineTrends');

      new Chart(pieCtx,{type:'pie',data:{labels:Object.keys(byCat),datasets:[{data:Object.values(byCat),backgroundColor:['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#14b8a6']}]} ,options:{plugins:{legend:{position:'bottom'}}}});
      new Chart(barCtx,{type:'bar',data:{labels:Object.keys(byBank),datasets:[{label:'Spends',data:Object.values(byBank),backgroundColor:'#3b82f6'}]},options:{plugins:{legend:{display:false}}}});
      new Chart(lineCtx,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],datasets:[{label:'Spends',data:byMonth,borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,0.2)',tension:0.35,fill:true}]},options:{plugins:{legend:{display:false}}}});
    };

    const rerender = () => { renderStats(); renderTable(); renderCharts(); };

    [monthSelect, bankSelect, categorySelect].forEach(s=> s.addEventListener('change',()=>{ $('#charts').innerHTML = chartsHTML(); rerender(); }));

    const chartsHTML = () => (
      `<div class="charts" id="charts">
        <div class="chart"><canvas id="pieCat"></canvas></div>
        <div class="chart"><canvas id="barBank"></canvas></div>
        <div class="chart"><canvas id="lineTrends"></canvas></div>
      </div>`
    );

    renderFilters();
    $('#charts').innerHTML = chartsHTML();
    rerender();
  }
})();
