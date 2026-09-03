import React,{useState} from 'react';
import { BarChart, Button, DataTable, Donut, Field, FilterField, FormGrid, MetricCard, Modal, PageHeader, Pagination, Panel, SearchField, StatusBadge, TextAreaField } from '../components/UI';
import { cargoRows } from '../data';
import { Icon } from '../icons';

export default function CargoPage(){
 const [open,setOpen]=useState(false); const rows=cargoRows.map(r=>[...r,<div className="action-group"><button className="small-icon"><Icon name="eye" size={15}/></button><button className="small-icon"><Icon name="more" size={15}/></button></div>]);
 return <>
 <PageHeader title="Shared Cargo Desk" subtitle="Branch collaboration for shipment intake, transit, arrival, collection, and final delivery." actions={<Button icon="plus" onClick={()=>setOpen(true)}>New Cargo</Button>}/>
 <div className="content-grid">
  <div className="stack"><div className="metrics-grid five"><MetricCard icon="box" label="Total Shipments" value="152" delta="↑ 14.6%" tone="blue"/><MetricCard icon="route" label="In Transit" value="67" delta="↑ 12.8%" tone="violet"/><MetricCard icon="clock" label="Ready for Collection" value="32" delta="↑ 18.3%" tone="orange"/><MetricCard icon="check" label="Delivered" value="35" delta="↑ 22.1%" tone="green"/><MetricCard icon="money" label="Cargo Revenue" value="USD 66,540" delta="↑ 18.6%" tone="cyan"/></div></div>
  <div className="split-even"><Panel title="Shipment Status Overview"><Donut total="152" segments={[{value:12,color:'#0b66e3',label:'Received'},{value:44,color:'#7c3aed',label:'In Transit'},{value:13,color:'#00a9c7',label:'Arrived'},{value:21,color:'#f59e0b',label:'Ready'},{value:10,color:'#16a34a',label:'Delivered'}]}/></Panel><Panel title="Route Activity"><BarChart values={[28,34,26,27,37]} labels={['MOG→NBO','NBO→MOG','MOG→DXB','NBO→DXB','MOG→JED']}/></Panel></div>
 </div>
 <div className="filter-row"><SearchField placeholder="Search tracking number, sender, receiver..."/><FilterField value="All Branches" icon="building"/><FilterField value="All Routes" icon="route"/><FilterField value="May 1 – May 31, 2025" icon="calendar"/><FilterField value="All Payment Status" icon="wallet"/></div>
 <Panel title="Shipments"><DataTable columns={['Tracking Number','Date','Route','Sender','Receiver','Weight','Charge','Payment','Status','Actions']} rows={rows}/><Pagination/></Panel>
 {open&&<Modal title="Create Cargo" subtitle="Record shipment, customer charge and payment responsibility." onClose={()=>setOpen(false)}>
  <div className="stack"><Panel title="Shipment Details"><FormGrid><Field label="Origin Branch" value="Mogadishu Office" icon="map"/><Field label="Destination Branch" value="Nairobi Office" icon="map"/><Field label="Date Received" value="09/01/2026" icon="calendar"/><Field label="Sender" placeholder="Enter sender name" icon="user"/></FormGrid></Panel>
  <Panel title="Contact Details"><FormGrid><Field label="Sender Phone" placeholder="Enter phone number" icon="phone"/><Field label="Sender Email (optional)" placeholder="client@example.com" icon="mail"/><Field label="Receiver" placeholder="Enter receiver name" icon="user"/><Field label="Receiver Phone" placeholder="Enter phone number" icon="phone"/></FormGrid></Panel>
  <Panel title="Pricing"><FormGrid><Field label="Contents" placeholder="e.g. Documents, Electronics, Apparel" icon="box"/><Field label="Currency" value="USD" icon="money"/><Field label="Weight (kg)" placeholder="0.00" icon="box"/><Field label="Pricing Status" value="Shipment rate" icon="trend"/><Field label="Rate per kg" placeholder="0.00" icon="money"/><Field label="Pricing Note / Flight Reference" placeholder="e.g. Flight SO-201 or agreed client rate" icon="plane"/></FormGrid></Panel>
  <Panel title="Customer Payment"><FormGrid><Field label="Customer Responsible for Payment" value="Sender" icon="user"/><Field label="Amount Due" value="USD 0.00" icon="money"/><Field label="Payment Choice" value="Pay Later" icon="wallet"/><Field label="Payment Status" value="Unpaid" icon="alert"/><TextAreaField label="Notes"/></FormGrid></Panel></div><div className="modal-actions"><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button icon="box">Create Cargo</Button></div>
 </Modal>}
 </>
}
