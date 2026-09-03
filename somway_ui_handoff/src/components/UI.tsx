import React, { ReactNode } from 'react';
import { Icon, IconName } from '../icons';

export function MetricCard({ icon, label, value, delta, tone='blue', foot, spark=[2,4,3,5,4,7,6,9] }: {icon:IconName; label:string; value:string; delta?:string; tone?:'blue'|'cyan'|'green'|'orange'|'violet'|'pink'|'red'; foot?:string; spark?:number[]}) {
  const points = spark.map((n,i)=>`${(i/(spark.length-1))*100},${34-n*3}`).join(' ');
  return <div className="metric-card card-hover">
    <div className={`metric-icon tone-${tone}`}><Icon name={icon} size={22}/></div>
    <div className="metric-main"><span className="eyebrow-soft">{label}</span><strong>{value}</strong>
      <div className="metric-foot"><span className={delta?.startsWith('-')?'negative':'positive'}>{delta?`${delta}`:''}</span><span>{foot}</span></div>
    </div>
    <svg className="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.2"/></svg>
  </div>
}

export function PageHeader({ title, subtitle, actions }: {title:string; subtitle?:string; actions?:ReactNode}) {
  return <div className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="page-actions">{actions}</div></div>
}

export function Button({ children, icon, variant='primary', onClick, type='button' }: {children:ReactNode; icon?:IconName; variant?:'primary'|'secondary'|'ghost'|'danger'; onClick?:()=>void; type?:'button'|'submit'}) {
  return <button type={type} className={`btn btn-${variant}`} onClick={onClick}>{icon && <Icon name={icon} size={17}/>}<span>{children}</span></button>
}

export function FilterField({ label, value, icon, wide=false }: {label?:string; value:string; icon?:IconName; wide?:boolean}) {
  return <label className={`filter-field ${wide?'wide':''}`}>{label && <span>{label}</span>}<div>{icon && <Icon name={icon} size={16}/>}<b>{value}</b><Icon name="chevron" size={14}/></div></label>
}

export function SearchField({ placeholder='Search...', value }: {placeholder?:string; value?:string}) {
  return <div className="search-field"><Icon name="search" size={18}/><span>{value||placeholder}</span></div>
}

export function StatusBadge({ children, tone='blue' }: {children:ReactNode; tone?:'blue'|'green'|'orange'|'red'|'violet'|'cyan'|'gray'}) {
  return <span className={`status-badge status-${tone}`}>{children}</span>
}

export function Panel({ title, subtitle, actions, children, className='', style }: {title?:string; subtitle?:string; actions?:ReactNode; children:ReactNode; className?:string; style?:React.CSSProperties}) {
  return <section className={`panel ${className}`} style={style}><div className="panel-head">{title && <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>}<div>{actions}</div></div>{children}</section>
}

export function Donut({ total, segments, centerLabel }: {total:string; segments:{value:number;color:string;label:string;amount?:string}[]; centerLabel?:string}) {
  let acc=0; const stops=segments.map(s=>{const start=acc; acc+=s.value; return `${s.color} ${start}% ${acc}%`}).join(', ');
  return <div className="donut-wrap"><div className="donut" style={{background:`conic-gradient(${stops})`}}><div><strong>{total}</strong><span>{centerLabel||'Total'}</span></div></div><div className="legend">{segments.map(s=><div key={s.label}><i style={{background:s.color}}/><span>{s.label}</span><b>{s.amount||`${s.value}%`}</b></div>)}</div></div>
}

export function LineChart({ points=[20,28,34,42,38,55,49,63,58,70,66,82], labels=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], unit='USD' }: {points?:number[];labels?:string[];unit?:string}) {
  const max=Math.max(...points,1); const poly=points.map((p,i)=>`${(i/(points.length-1))*100},${100-(p/max)*80-10}`).join(' ');
  return <div className="chart-area"><div className="chart-y"><span>{unit}</span><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="fillLine" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#0b66e3" stopOpacity=".18"/><stop offset="1" stopColor="#0b66e3" stopOpacity="0"/></linearGradient></defs><polygon points={`0,100 ${poly} 100,100`} fill="url(#fillLine)"/><polyline points={poly} fill="none" stroke="#0b66e3" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg><div className="chart-x">{labels.map(l=><span key={l}>{l}</span>)}</div></div></div>
}

export function BarChart({ values=[20,30,42,50,58,65], labels=['Jan','Feb','Mar','Apr','May','Jun'], dual=false }: {values?:number[];labels?:string[];dual?:boolean}) {
  const max=Math.max(...values,1); return <div className="bar-chart">{values.map((v,i)=><div className="bar-group" key={labels[i]}><div className="bar-stack"><i style={{height:`${(v/max)*100}%`}}/>{dual && <i className="second" style={{height:`${(v*.68/max)*100}%`}}/>}</div><span>{labels[i]}</span></div>)}</div>
}

export function DataTable({ columns, rows }: {columns:string[]; rows:(ReactNode[])[]}) {
  return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,ri)=><tr key={ri}>{r.map((c,ci)=><td key={ci}>{c}</td>)}</tr>)}</tbody></table></div>
}

export function Modal({ title, subtitle, children, side, onClose }: {title:string; subtitle?:string; children:ReactNode; side?:ReactNode; onClose:()=>void}) {
  return <div className="modal-backdrop"><div className="modal-card"><button className="modal-close" onClick={onClose}><Icon name="x"/></button><div className="modal-title"><span className="eyebrow">Agency Workspace</span><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><div className={`modal-grid ${side?'with-side':''}`}><div>{children}</div>{side&&<aside className="modal-side">{side}</aside>}</div></div></div>
}

export function FormGrid({ children }: {children:ReactNode}) { return <div className="form-grid">{children}</div> }
export function Field({ label, placeholder, icon, full=false, value }: {label:string;placeholder?:string;icon?:IconName;full?:boolean;value?:string}) { return <label className={`field ${full?'full':''}`}><span>{label}</span><div>{icon&&<Icon name={icon} size={16}/>}<span className={value?'value':''}>{value||placeholder||''}</span></div></label> }
export function TextAreaField({ label, placeholder='Add any notes (optional)' }: {label:string;placeholder?:string}) { return <label className="field full"><span>{label}</span><div className="textarea"><Icon name="edit" size={16}/><span>{placeholder}</span></div></label> }

export function Pagination() { return <div className="pagination"><button>‹</button><button className="active">1</button><button>2</button><button>3</button><span>…</span><button>13</button><button>›</button></div> }
