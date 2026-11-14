/* Duet RRF Card 0.3.2 - dark responsive printer cockpit, no external dependencies. */
const TYPES = ['entity','camera','power','gcode','control','macro','heading','light','button','spacer'];
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaults = () => ({type:'custom:duet-rrf-card',title:'Duet RRF',entry_id:'',status_entity:'',heater_entities:[],
  columns:{mobile:2,tablet:4,desktop:6},gap:10,radius:12,layout:{mobile:[],tablet:[],desktop:[]},blocks:[
    {id:'status',kind:'entity',entity:'',label:'Printer status',w:2,h:1},
    {id:'camera',kind:'camera',entity:'',label:'Camera',w:3,h:3},
    {id:'power',kind:'power',entity:'',label:'Printer power',w:2,h:1},
  ]});
const uid = () => 'b'+Math.random().toString(36).slice(2,10);
class DuetRrfCard extends HTMLElement {
  setConfig(config) {
    if (!config || config.type !== 'custom:duet-rrf-card') throw new Error('Invalid Duet RRF card config');
    this.config = {...defaults(),...config,columns:{...defaults().columns,...(config.columns||{})},blocks:config.blocks||defaults().blocks};
    this.render();
  }
  set hass(hass) {this._hass=hass;this.render();}
  getCardSize(){return 5;}
  connectedCallback(){this.render();}
  _breakpoint(){const w=this.getBoundingClientRect().width || window.innerWidth;return w<500?'mobile':w<900?'tablet':'desktop';}
  _columns(){return this.config.columns[this._breakpoint()];}
  _orderedBlocks(){const ids=this.config.layout?.[this._breakpoint()]||[];return [...(this.config.blocks||[])].sort((a,b)=>{const x=ids.indexOf(a.id),y=ids.indexOf(b.id);return (x<0?9999:x)-(y<0?9999:y);});}
  _dimension(b,key){return b.sizes?.[this._breakpoint()]?.[key]??b[key]??1;}
  _state(entity){return this._hass?.states?.[entity];}
  _power(b){
    const st=this._state(b.entity),on=st?.state==='on';
    return `<div class="value">${esc(st?.state||'unavailable')}</div><button data-act="power" data-id="${esc(b.id)}" ${!st||!['on','off'].includes(st.state)?'disabled':''}>${on?'Turn off':'Turn on'}</button>`;
  }
  _num(entity){const n=Number(this._state(entity)?.state);return Number.isFinite(n)?n:null;}
  _text(entity){const st=this._state(entity);return !st||['unknown','unavailable'].includes(st.state)?'—':st.state;}
  _icon(kind){return ({camera:'◉',power:'⏻',entity:'▣',control:'⌘',macro:'▤',gcode:'›_',light:'◈',button:'●',heading:'◆'})[kind]||'◈';}
  _progress(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;}
  _related(suffix){const prefix=(this.config.status_entity||'').replace(/status$/,'');return prefix?prefix+suffix:'';}
  _block(b){
    const kind=b.kind||'entity',state=this._state(b.entity),value=this._text(b.entity),unit=state?.attributes?.unit_of_measurement||'';
    if(kind==='spacer')return '';
    if(kind==='heading')return `<div class="section-heading">${esc(b.label||'Abschnitt')}</div>`;
    if(kind==='camera')return b.entity?`<div class="camera" data-camera="${esc(b.entity)}"></div>`:'<div class="empty">Kamera auswählen</div>';
    if(kind==='power')return `<div class="power-row"><div><div class="metric ${value==='on'?'ok':''}">${value==='on'?'EINGESCHALTET':value==='off'?'AUSGESCHALTET':'—'}</div><div class="sub">${esc(b.entity)}</div></div><button class="action power-button" data-act="power" data-id="${esc(b.id)}" ${!state||!['on','off'].includes(state.state)?'disabled':''}>${value==='on'?'Ausschalten':'Einschalten'}</button></div>`;
    if(kind==='light'||kind==='button')return `<div class="metric">${esc(value)}</div><button class="action" data-act="toggle" data-id="${esc(b.id)}" ${!state?'disabled':''}>${kind==='button'?'Ausführen':value==='on'?'Ausschalten':'Einschalten'}</button>`;
    if(kind==='gcode')return `<div class="console"><div class="console-input"><span class="prompt">&gt;</span><input data-gcode="${esc(b.id)}" placeholder="G-Code eingeben …" autocomplete="off" spellcheck="false"/><button class="action primary" data-act="gcode" data-id="${esc(b.id)}">Senden</button></div><pre class="reply" data-reply="${esc(b.id)}">Bereit · einzelne G-Code-Zeile</pre></div>`;
    if(kind==='control')return `<div class="controls"><button class="action primary" data-act="pause" data-id="${esc(b.id)}">Ⅱ Pause</button><button class="action" data-act="resume" data-id="${esc(b.id)}">▶ Fortsetzen</button><button class="action danger" data-act="cancel" data-id="${esc(b.id)}">■ Abbrechen</button></div>`;
    if(kind==='macro')return `<div class="macro-area"><button class="action" data-act="macros" data-id="${esc(b.id)}">↻ Makros laden</button><div class="macro-list" data-macros="${esc(b.id)}"></div></div>`;
    if(kind==='entity'){
      const id=b.entity||'';
      if(id.endsWith('print_progress')){const pct=this._progress(value);return `<div class="metric accent">${value==='—'?'—':esc(value)+' %'}</div><div class="track"><div class="fill" style="width:${pct}%"></div></div><div class="sub">Druckfortschritt</div>`;}
      if(/heater_[01]_temperature$/.test(id)){
        const target=this._num(id.replace('_temperature','_target'));
        const current=this._num(id);const pct=current===null?0:Math.max(0,Math.min(100,current/300*100));
        return `<div class="temp-row"><div class="metric warm">${esc(value)}<span class="unit">°C</span></div><div class="temp-target">SOLL<br><strong>${target===null?'—':target+'°'}</strong></div></div><div class="track heat"><div class="fill" style="width:${pct}%"></div></div>`;
      }
      if(/_position$/.test(id))return `<div class="metric compact">${esc(value)}<span class="unit">${esc(unit||'mm')}</span></div>`;
      if(/fan_\d+_speed$/.test(id))return `<div class="metric compact">${esc(value)}<span class="unit">${esc(unit||'%')}</span></div><div class="track"><div class="fill" style="width:${this._progress(value)}%"></div></div>`;
      if(id.endsWith('_status'))return `<div class="status-pill ${value==='idle'?'idle':value==='processing'?'printing':''}"><span class="dot"></span>${esc(value==='idle'?'Bereit · Leerlauf':value)}</div>`;
      return `<div class="metric ${value==='—'?'muted':''}">${esc(value)}${unit?`<span class="unit">${esc(unit)}</span>`:''}</div>`;
    }
    return '';
  }
  render(){
    if(!this.config||!this.isConnected)return;
    const cols=Math.max(1,Number(this._columns())||2),blocks=this._orderedBlocks();
    const status=this._text(this.config.status_entity);
    const progress=this._text(this._related('print_progress'));
    const heaters=this.config.heater_entities||[];
    const cameraNodes=new Map([...this.querySelectorAll('[data-camera]')].map(el=>[el.dataset.camera,el.firstElementChild]).filter(x=>x[1]&&x[1].tagName==='HA-CAMERA-STREAM'));
    this.innerHTML=`<style>
      :host{display:block;--duet-bg:#10151d;--duet-panel:#1b2430;--duet-border:#303d4e;--duet-text:#f1f6fc;--duet-muted:#95a8bc;--duet-accent:#26b9ec;--duet-green:#39d4a1;--duet-orange:#ffb454;color:var(--duet-text);font-family:Inter,Roboto,Arial,sans-serif}
      *{box-sizing:border-box}ha-card{background:var(--duet-bg);color:var(--duet-text);padding:18px;border-radius:18px;border:1px solid #293442;box-shadow:0 12px 36px #0002;overflow:hidden}
      .hero{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 18px;flex-wrap:wrap}.brand{display:flex;gap:12px;align-items:center}.brand-icon{width:44px;height:44px;border:1px solid #36546a;border-radius:13px;display:grid;place-items:center;background:#173044;color:var(--duet-accent);font-size:25px}.eyebrow{font-size:10px;font-weight:800;letter-spacing:2px;color:var(--duet-accent);margin-bottom:3px}.hero h2{font-size:21px;letter-spacing:-.5px;margin:0;font-weight:750}.hero-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.live{font-size:11px;color:var(--duet-muted);font-weight:650}.live .dot{display:inline-block;margin-right:7px}.mini-progress{font-size:12px;color:var(--duet-muted);padding:8px 12px;border:1px solid var(--duet-border);border-radius:9px;background:#19222e}
      .grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));grid-auto-rows:minmax(66px,auto);gap:${Math.max(4,Number(this.config.gap)||10)}px;align-items:stretch}.tile{position:relative;min-width:0;min-height:0;overflow:hidden;background:linear-gradient(155deg,#202b39,#19222e);border:1px solid var(--duet-border);border-radius:${Math.max(6,Number(this.config.radius)||14)}px;padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:inset 0 1px #ffffff08}.tile:has(.camera){padding:0}.tile:has(.camera) .tile-title{padding:13px 14px 0}.tile:has(.camera) .camera{flex:1;min-height:170px}.tile-title{display:flex;align-items:center;gap:8px;min-width:0;font-size:11px;font-weight:800;letter-spacing:.55px;text-transform:uppercase;color:#b4c7d8}.tile-title .glyph{color:var(--duet-accent);font-size:14px}.tile-title span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.metric{font-size:clamp(20px,2.4vw,33px);font-weight:750;line-height:1.12;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;letter-spacing:-.7px}.metric.compact{font-size:25px}.metric.accent{color:var(--duet-accent)}.metric.warm{color:#ffd08b}.metric.ok{color:var(--duet-green)}.metric.muted{color:var(--duet-muted)}.unit{font-size:.5em;color:var(--duet-muted);font-weight:600;margin-left:5px}.sub{font-size:10px;color:var(--duet-muted);overflow-wrap:anywhere}.track{height:6px;width:100%;border-radius:999px;background:#0e1721;overflow:hidden;margin-top:auto}.fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#137aa9,#31c9f4);transition:width .5s}.track.heat .fill{background:linear-gradient(90deg,#f0a04d,#ffcf7d)}.temp-row{display:flex;justify-content:space-between;align-items:center;gap:5px}.temp-target{text-align:right;font-size:9px;color:var(--duet-muted);line-height:1.4}.temp-target strong{font-size:15px;color:#d7e4f1}.status-pill{display:inline-flex;align-items:center;gap:8px;border:1px solid #385b53;color:var(--duet-green);background:#183b34;border-radius:9px;padding:10px 12px;font-size:13px;font-weight:700;align-self:flex-start}.dot{display:inline-block;width:7px;height:7px;background:var(--duet-green);border-radius:50%;box-shadow:0 0 10px #39d4a155}.status-pill.printing{color:var(--duet-accent);background:#16364b;border-color:#315975}.status-pill.printing .dot{background:var(--duet-accent)}
      .camera{position:relative;background:#0a0e14;overflow:hidden}.camera ha-camera-stream{width:100%;height:100%;min-height:170px;display:block;object-fit:contain}.empty{color:var(--duet-muted);font-size:12px}.power-row{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}.power-row .metric{font-size:15px}.action{cursor:pointer;background:#28394a;color:var(--duet-text);border:1px solid #476077;padding:10px 13px;border-radius:9px;font-size:12px;font-weight:700;transition:background .15s}.action:hover{background:#344c62}.action.primary{background:#136e9a;border-color:#258ab9}.action.danger{background:#4c2831;border-color:#a65b68;color:#ffb6bd}.action:disabled{opacity:.4;cursor:not-allowed}.controls{display:flex;gap:8px;flex-wrap:wrap}.macro-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.macro-list button{background:#26384a;border:1px solid #476077;color:white;border-radius:8px;padding:8px;cursor:pointer}.console{display:flex;flex-direction:column;flex:1;min-height:0}.console-input{display:flex;align-items:center;gap:8px;background:#0e1620;padding:8px;border:1px solid #34475a;border-radius:9px}.prompt{color:var(--duet-green);font-weight:800}.console input{background:transparent;color:#f1f6fc;border:0;outline:none;min-width:0;flex:1;font:12px monospace}.reply{white-space:pre-wrap;overflow-wrap:anywhere;overflow:auto;color:#8faac0;font:11px/1.5 monospace;min-height:25px;max-height:140px}.section-heading{font-size:16px;font-weight:800;color:var(--duet-text)}.footer{margin-top:13px;color:#667d90;font-size:10px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
      @media(max-width:550px){ha-card{padding:10px;border-radius:13px}.hero{margin:4px 2px 14px}.hero h2{font-size:18px}.brand-icon{width:38px;height:38px}.tile{padding:11px}.metric{font-size:23px}.controls .action{flex:1}.power-row .action{width:100%}}
    </style><ha-card><header class="hero"><div class="brand"><div class="brand-icon">⬡</div><div><div class="eyebrow">DUET · REPRAPFIRMWARE</div><h2>${esc(this.config.title||'Voron Cockpit')}</h2></div></div><div class="hero-right"><span class="live"><span class="dot"></span>${esc(status==='—'?'Verbindung prüfen':status==='idle'?'Bereit':'Status: '+status)}</span><span class="mini-progress">${progress==='—'?'Kein Druck aktiv':esc(progress)+' % abgeschlossen'}</span></div></header><div class="grid">${blocks.map(b=>{const width=Math.min(cols,Math.max(1,Number(this._dimension(b,'w'))||1)),height=Math.max(1,Number(this._dimension(b,'h'))||1);return `<section class="tile" style="grid-column:span ${width};grid-row:span ${height};${b.background?'background:'+esc(b.background)+';':''}${b.radius!==undefined?'border-radius:'+Math.max(0,Number(b.radius)||0)+'px;':''}${b.padding!==undefined?'padding:'+Math.max(0,Number(b.padding)||0)+'px;':''}${b.color?'color:'+esc(b.color)+';':''}" data-block="${esc(b.id)}"><div class="tile-title"><span class="glyph">${this._icon(b.kind)}</span><span>${esc(b.label||b.kind)}</span></div>${this._block(b)}</section>`;}).join('')}</div><div class="footer"><span>VORON · DRUCKERÜBERSICHT</span><span>Duet RRF Dashboard v0.3.2</span></div></ha-card>`;
    for(const el of this.querySelectorAll('[data-camera]')){const id=el.dataset.camera;if(!this._hass?.states?.[id]){el.textContent='Kamera nicht verfügbar';continue;}let camera=cameraNodes.get(id);if(!camera){camera=document.createElement('ha-camera-stream');camera.entityid=id;camera.controls=true;}camera.hass=this._hass;el.append(camera);}
    this.querySelectorAll('[data-act]').forEach(btn=>btn.addEventListener('click',()=>this._act(btn)));
  }
  async _act(btn){
    if(!this._hass)return;
    const action=btn.dataset.act,b=this.config.blocks.find(x=>x.id===btn.dataset.id);
    try{
      if(action==='toggle'){
        if(!b.entity||!this._state(b.entity))return;
        const domain=b.entity.split('.')[0];
        if(!['light','switch','input_boolean','button','input_button'].includes(domain))throw new Error('Unsupported entity for this control');
        await this._hass.callService(domain,domain.includes('button')?'press':'toggle',{entity_id:b.entity});
      }else if(action==='power'){
        const state=this._state(b.entity)?.state;
        if(state==='on'){
          // Fail closed if printer state or temperatures cannot be verified.
          const status=this._state(this.config.status_entity)?.state;
          const heaters=this.config.heater_entities||[];
          const cool=heaters.length>0&&heaters.every(id=>{const s=this._state(id);return s&&Number.isFinite(Number(s.state))&&Number(s.state)<50;});
          if(status!=='idle'||!cool){alert('Power-off blocked: printer must be idle and all configured heaters below 50 °C. Configure status_entity and heater_entities.');return;}
          if(!confirm('Turn off printer power? Check fans and hotend cooling first.'))return;
        }
        await this._hass.callService(b.entity.split('.')[0],state==='on'?'turn_off':'turn_on',{entity_id:b.entity});
      }else if(action==='gcode'){
        const code=this.querySelector(`[data-gcode="${b.id}"]`)?.value?.trim();
        if(!code||/[\r\n]/.test(code))return;
        if(!confirm(`Send G-code: ${code}?`))return;
        const response=await this._hass.callService('duet_rrf','send_gcode',{entry_id:this.config.entry_id,gcode:code},undefined,true);
        const out=this.querySelector(`[data-reply="${b.id}"]`);if(out)out.textContent=JSON.stringify(response?.response||response||'Sent');
      }else if(['pause','resume','cancel'].includes(action)){
        if(!confirm(`Printer action: ${action}?`))return;
        await this._hass.callService('duet_rrf','printer_control',{entry_id:this.config.entry_id,action});
      }else if(action==='macros'){
        const result=await this._hass.callService('duet_rrf','list_macros',{entry_id:this.config.entry_id},undefined,true);
        const names=result?.macros||result?.response?.macros||[];
        const target=this.querySelector(`[data-macros="${b.id}"]`);target.replaceChildren();
        for(const name of names){const button=document.createElement('button');button.textContent=name;button.onclick=async()=>{if(confirm(`Run macro ${name}?`))await this._hass.callService('duet_rrf','run_macro',{entry_id:this.config.entry_id,name});};target.append(button);}
      }
    }catch(err){alert(`Duet action failed: ${err.message||err}`);}
  }
  static getConfigElement(){return document.createElement('duet-rrf-card-editor');}
  static getStubConfig(){return defaults();}
}
customElements.define('duet-rrf-card',DuetRrfCard);
window.customCards=window.customCards||[];
window.customCards.push({type:'duet-rrf-card',name:'Duet RRF Dashboard',description:'Configurable Duet printer dashboard with cameras, entities and controls'});

class DuetRrfCardEditor extends HTMLElement {
  setConfig(config){this.config=structuredClone({...defaults(),...config,columns:{...defaults().columns,...(config.columns||{})},layout:{...defaults().layout,...(config.layout||{})}});this.render();}
  set hass(hass){this._hass=hass;this.render();}
  connectedCallback(){this.render();}
  _emit(){this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this.config},bubbles:true,composed:true}));}
  _input(label,value,change,type='text'){
    const row=document.createElement('label');row.style.cssText='display:block;margin:8px 0';row.textContent=label+' ';
    const input=document.createElement('input');input.type=type;input.value=value??'';input.style.cssText='width:100%;box-sizing:border-box;padding:7px';input.onchange=()=>change(input.value);row.append(input);return row;
  }
  render(){if(!this.config||!this.isConnected)return;this.replaceChildren();
    const heading=document.createElement('h3');heading.textContent='Duet RRF Card Editor';this.append(heading);
    for(const [label,key] of [['Title','title'],['Duet config entry ID','entry_id'],['Printer status entity','status_entity'],['Heater temperature entities (comma separated)','heater_entities'],['Gap (px)','gap'],['Corner radius (px)','radius']]){
      const v=key==='heater_entities'?(this.config[key]||[]).join(', '):this.config[key];
      this.append(this._input(label,v,value=>{this.config[key]=key==='heater_entities'?value.split(',').map(x=>x.trim()).filter(Boolean):value;this._emit();}));
    }
    for(const size of ['mobile','tablet','desktop'])this.append(this._input(`${size} columns`,this.config.columns[size],value=>{this.config.columns[size]=Math.max(1,Math.min(12,Number(value)||1));this._emit();},'number'));
    const selector=document.createElement('select');for(const size of ['mobile','tablet','desktop']){const opt=document.createElement('option');opt.value=size;opt.textContent='Edit '+size+' layout';selector.append(opt);}selector.value=this._size||'desktop';selector.onchange=()=>{this._size=selector.value;this.render();};this.append(selector);
    const currentSize=this._size||'desktop';
    const ids=this.config.layout[currentSize]||[];
    const ordered=[...this.config.blocks].sort((a,b)=>{const x=ids.indexOf(a.id),y=ids.indexOf(b.id);return (x<0?9999:x)-(y<0?9999:y);});
    const h=document.createElement('h4');h.textContent='Blocks – drag to reorder; adjust width and height';this.append(h);
    ordered.forEach((block,index)=>{
      const panel=document.createElement('div');panel.draggable=true;panel.style.cssText='padding:10px;border:1px solid var(--divider-color);border-radius:8px;margin:8px 0';
      panel.ondragstart=e=>e.dataTransfer.setData('text/plain',String(index));
      panel.ondragover=e=>e.preventDefault();panel.ondrop=e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));if(!Number.isInteger(from)||from<0||from>=ordered.length)return;const moved=ordered.splice(from,1)[0];ordered.splice(index,0,moved);this.config.layout[currentSize]=ordered.map(x=>x.id);this._emit();this.render();};
      const title=document.createElement('strong');title.textContent='↕ '+(block.label||block.kind);panel.append(title);
      const select=document.createElement('select');for(const kind of TYPES){const opt=document.createElement('option');opt.value=kind;opt.textContent=kind;opt.selected=kind===block.kind;select.append(opt);}select.onchange=()=>{block.kind=select.value;this._emit();this.render();};panel.append(select);
      for(const [label,key,type] of [['Label','label','text'],['Background CSS color','background','text'],['Text CSS color','color','text'],['Corner radius (px)','radius','number'],['Padding (px)','padding','number']])panel.append(this._input(label,block[key],value=>{block[key]=type==='number'?Math.max(0,Math.min(100,Number(value)||0)):value;this._emit();},type));
      const picker=document.createElement('ha-entity-picker');picker.hass=this._hass;picker.value=block.entity||'';picker.label='Home Assistant entity / camera';picker.addEventListener('value-changed',e=>{block.entity=e.detail.value;this._emit();});panel.append(picker);
      block.sizes=block.sizes||{};block.sizes[currentSize]=block.sizes[currentSize]||{};
      for(const [label,key] of [['Width (columns)','w'],['Height (rows)','h']])panel.append(this._input(label,block.sizes[currentSize][key]??block[key]??1,value=>{block.sizes[currentSize][key]=Math.max(1,Math.min(24,Number(value)||1));this._emit();},'number'));
      const del=document.createElement('button');del.textContent='Remove block';del.onclick=()=>{this.config.blocks=this.config.blocks.filter(x=>x.id!==block.id);for(const size of ['mobile','tablet','desktop'])this.config.layout[size]=(this.config.layout[size]||[]).filter(id=>id!==block.id);this._emit();this.render();};panel.append(del);this.append(panel);
    });
    const add=document.createElement('button');add.textContent='+ Add block';add.onclick=()=>{const block={id:uid(),kind:'entity',label:'New block',entity:'',w:2,h:1};this.config.blocks.push(block);this.config.layout[currentSize]=[...(this.config.layout[currentSize]||[]),block.id];this._emit();this.render();};this.append(add);
    const note=document.createElement('p');note.textContent='Drag blocks to reorder the selected screen layout; width and height are saved separately for mobile, tablet and desktop. Choose any HA entity or camera. Power-off protection requires a status entity and all relevant heater sensors.';this.append(note);
  }
}
customElements.define('duet-rrf-card-editor',DuetRrfCardEditor);
