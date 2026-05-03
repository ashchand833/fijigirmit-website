(function(){
  const REPO = 'Ashchand833/fijigirmit-website';
  const BRANCH = (location.hostname.includes('staging--') || location.hostname.includes('localhost')) ? 'staging' : 'main';
  const FALLBACK_EVENTS = [
    {title:'Girmit Connections Youth Workshop',date:'2026-06-07',date_display:'Sunday 7 June 2026',time:'1.00pm - 3.00pm',venue:'Ormiston Junior College',category:'Upcoming Event',description:'A youth workshop with Shana Chandra remembering the 147th Fiji Girmit Anniversary 2026. All youth from all cultures aged 12–24 are welcome. Explore the powerful history of the Girmit journey through stories, identity and belonging.',flyer:'/images/girmit-connections-youth-workshop-2026.png',photos:[],show_on_homepage:true},
    {title:'147th Girmit Remembrance Day',date:'2026-05-16',date_display:'Saturday 16 May 2026',time:'5.00pm - 8.30pm',venue:'Malaeola Community Centre, 16 Waokauri Place, Mangere, Auckland',category:'Upcoming Event',description:'An evening of remembrance, recognition and celebration.',flyer:'girmitday.jpg',photos:[],show_on_homepage:true},
    {title:"International Women's Day High Tea",date:'2026-03-08',date_display:'Sunday 8 March 2026',time:'2.00pm - 4.00pm',venue:'Divine Patisserie, 240 Ormiston Road, Auckland 2019',category:'Upcoming Event',description:'Balance the Scales - IWD 2026.',flyer:'hightea.jpg',photos:[],show_on_homepage:true},
    {title:'Fiji NZ Girmit Day Celebration',date:'2025-05-14',date_display:'Fiji NZ Girmit Day Celebration',category:'Photo Gallery',description:'Celebrating community, remembrance and cultural connection.',photos:['gday1.jpg','gday2.jpg','gday3.jpg','gday4.jpg','gday5.jpg','gday6.jpg','gday7.jpg','gday8.jpg','gday9.jpg','gday10.jpg','gday11.jpg','gday12.jpg','gday14.jpg','gday15.jpg','gday16.jpg','gday17.jpg','gday21.jpg'],show_on_homepage:true},
    {title:'Diwali Celebrations 2024',date:'2024-11-01',date_display:'Diwali Celebrations 2024',category:'Photo Gallery',description:'Festival moments from the Diwali celebrations.',photos:['diwali-1.jpg','diwali-2.jpg','diwali-3.jpg','diwali-4.jpg','diwali-5.jpg','diwali-6.jpg'],show_on_homepage:true},
    {title:'Breast Cancer Awareness Campaign',date:'2024-10-01',date_display:'Breast Cancer Awareness Campaign',category:'Photo Gallery',description:'Community awareness and support campaign.',photos:['cancer-1.jpg','cancer-2.jpg','cancer-3.jpg','cancer-4.jpg','cancer-5.jpg','cancer-6.jpg','cancer-7.jpg','cancer-8.jpg'],show_on_homepage:true}
  ];
  function clean(v){return String(v||'').trim().replace(/^['"]|['"]$/g,'');}
  function normalizePath(p){
    p=clean(p); if(!p) return '';
    if(/^https?:\/\//i.test(p) || p.startsWith('/')) return p;
    return p;
  }
  function parseScalar(v){
    v=clean(v);
    if(v==='true') return true; if(v==='false') return false;
    if(v==='' || v==='null') return '';
    if(!Number.isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v;
  }
  function parseFrontMatter(text){
    const out={};
    if(!text || !text.trim().startsWith('---')) return out;
    const end=text.indexOf('\n---',3);
    if(end<0) return out;
    const yaml=text.slice(3,end).replace(/\r/g,'').split('\n');
    let i=0;
    while(i<yaml.length){
      const line=yaml[i];
      if(!line.trim() || line.trim().startsWith('#')){i++;continue;}
      const m=line.match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
      if(!m){i++;continue;}
      const key=m[1]; const rest=m[2];
      if(rest!=='') { out[key]=parseScalar(rest); i++; continue; }
      // parse simple list, especially photos:
      const arr=[]; i++;
      while(i<yaml.length && /^\s+-\s*/.test(yaml[i])){
        const itemLine=yaml[i].replace(/^\s+-\s*/, '');
        if(itemLine.includes(':')){
          const [k,...parts]=itemLine.split(':');
          const obj={}; obj[k.trim()]=parseScalar(parts.join(':'));
          i++;
          while(i<yaml.length && /^\s{4,}[A-Za-z0-9_\-]+:/.test(yaml[i])){
            const mm=yaml[i].trim().match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
            if(mm) obj[mm[1]]=parseScalar(mm[2]);
            i++;
          }
          arr.push(obj);
        }else{ arr.push(parseScalar(itemLine)); i++; }
      }
      out[key]=arr;
    }
    return out;
  }
  function formatDate(date, longForm=true){
    if(!date) return '';
    const d=new Date(date); if(Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-NZ',{weekday:longForm?'long':undefined,day:'numeric',month:'long',year:'numeric'});
  }
  function sortEvents(items){
    return [...(items||[])].sort((a,b)=>{
      const ad=a.date?new Date(a.date).getTime():-Infinity;
      const bd=b.date?new Date(b.date).getTime():-Infinity;
      if(bd!==ad) return bd-ad; // latest/future dates first
      return (Number(a.sort_order)||100)-(Number(b.sort_order)||100);
    });
  }
  function getPhotos(item){
    const list=[];
    if(item.flyer) list.push(normalizePath(item.flyer));
    const photos=item.photos||[];
    photos.forEach(p=>{
      const src=typeof p==='string'?p:(p&&p.image);
      if(src) list.push(normalizePath(src));
    });
    if(item.image) list.push(normalizePath(item.image));
    if(item.images && Array.isArray(item.images)) item.images.forEach(p=>p&&list.push(normalizePath(p)));
    return [...new Set(list.filter(Boolean))];
  }
  function coverImage(item){ return getPhotos(item)[0] || ''; }
  async function loadEvents(){
    try{
      const api=`https://api.github.com/repos/${REPO}/contents/events?ref=${BRANCH}`;
      const res=await fetch(api,{headers:{Accept:'application/vnd.github+json'}});
      if(!res.ok) throw new Error('GitHub API returned '+res.status);
      const files=(await res.json()).filter(f=>f.name && f.name.endsWith('.md'));
      const items=await Promise.all(files.map(async f=>{
        const r=await fetch(f.download_url); if(!r.ok) return null;
        const text=await r.text(); const data=parseFrontMatter(text);
        data._file=f.name;
        data.title=data.title || data.name || f.name.replace(/\.md$/,'').replace(/-/g,' ');
        data.category=data.category || (data.display_mode==='flyer'?'Upcoming Event':'Photo Gallery');
        data.photos=data.photos || [];
        return data;
      }));
      const cleaned=items.filter(Boolean);
      if(cleaned.length) return sortEvents(cleaned);
    }catch(e){ console.warn('CMS event load failed, using fallback:',e); }
    return sortEvents(FALLBACK_EVENTS);
  }
  window.cmsLoadEvents=loadEvents;
  window.cmsFormatDate=formatDate;
  window.cmsSortEvents=sortEvents;
  window.cmsEventImages=getPhotos;
  window.cmsCoverImage=coverImage;
})();
