/* Duet RRF Card 0.3.0 - standalone custom Lovelace card, no external dependencies. */
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
  _block(b){
    const st=this._state(b.entity),kind=b.kind||'entity';
    if(kind==='spacer')return '';
    if(kind==='light'||kind==='button')return `<div class="value">${esc(st?.state||'unavailable')}</div><button data-act="toggle" data-id="${esc(b.id)}" ${!st?'disabled':''}>${kind==='button'?'Press':st?.state==='on'?'Turn off':'Turn on'}</button>`;
    if(kind==='heading')return `<h3>${esc(b.label||'Heading')}</h3>`;
    if(kind==='entity')return `<div class="value">${esc(st?.state||'—')} ${esc(st?.attributes?.unit_of_measurement||'')}</div><small>${esc(b.entity||'Select entity in editor')}</small>`;
    if(kind==='camera')return b.entity ? `<div class="camera" data-camera="${esc(b.entity)}"></div>` : '<small>Select a camera entity</small>';
    if(kind==='power')return this._power(b);
    if(kind==='gcode')return `<input data-gcode="${esc(b.id)}" placeholder="Single G-code line"/><button data-act="gcode" data-id="${esc(b.id)}">Send G-code</button><pre class="reply" data-reply="${esc(b.id)}"></pre>`;
    if(kind==='control')return `<div class="buttons">${['pause','resume','cancel'].map(a=>`<button data-act="${a}" data-id="${esc(b.id)}">${a}</button>`).join('')}</div>`;
    if(kind==='macro')return `<button data-act="macros" data-id="${esc(b.id)}">Load macros</button><div data-macros="${esc(b.id)}"></div>`;
    return '';
  }
  render(){
    if(!this.config||!this.isConnected)return;
    const cols=this._columns();
    const blocks=this._orderedBlocks();
    this.innerHTML=`<style>
      :host{display:block;color:var(--primary-text-color)}ha-card{padding:14px;background:var(--ha-card-background,var(--card-background-color));border-radius:var(--ha-card-border-radius,12px)}
      .grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));grid-auto-rows:minmax(72px,auto);gap:${Number(this.config.gap)||10}px}
      .tile{min-width:0;overflow:hidden;background:var(--secondary-background-color);border-radius:${Number(this.config.radius)||12}px;padding:12px;box-sizing:border-box}
      .tile h4{margin:0 0 8px;font-size:14px}.value{font-size:20px;font-weight:600;overflow-wrap:anywhere}small{opacity:.7;overflow-wrap:anywhere}
      button{cursor:pointer;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);padding:7px 10px;border-radius:8px;margin:4px 4px 0 0}button:disabled{opacity:.45;cursor:not-allowed}
      input{width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);padding:9px;border-radius:6px}
      .camera{width:100%;height:100%;min-height:120px}.camera ha-camera-stream{width:100%;height:100%;display:block}pre{white-space:pre-wrap;overflow-wrap:anywhere}
    </style><ha-card><h3>${esc(this.config.title||'Duet RRF')}</h3><div class="grid">${blocks.map(b=>{
      const width=Math.min(cols,Math.max(1,Number(this._dimension(b,'w'))||1));const height=Math.max(1,Number(this._dimension(b,'h'))||1);
      return `<section class="tile" style="grid-column:span ${width};grid-row:span ${height};${b.background?'background:'+esc(b.background)+';':''}${b.radius!==undefined?'border-radius:'+Math.max(0,Number(b.radius)||0)+'px;':''}${b.padding!==undefined?'padding:'+Math.max(0,Number(b.padding)||0)+'px;':''}${b.color?'color:'+esc(b.color)+';':''}" data-block="${esc(b.id)}"><h4>${esc(b.label||b.kind)}</h4>${this._block(b)}</section>`;
    }).join('')}</div></ha-card>`;
    for(const el of this.querySelectorAll('[data-camera]')){
      const id=el.dataset.camera;
      if(this._hass?.states?.[id]){
        const camera=document.createElement('ha-camera-stream');camera.hass=this._hass;camera.entityid=id;camera.controls=true;el.append(camera);
      }else el.textContent='Camera unavailable';
    }
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
