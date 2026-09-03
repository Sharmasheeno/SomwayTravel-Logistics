import React,{useState} from 'react';
import { Button, DataTable, Field, FilterField, FormGrid, MetricCard, Modal, PageHeader, Pagination, Panel, SearchField, StatusBadge, TextAreaField } from '../components/UI';
import { ticketRows } from '../data';
import { Icon } from '../icons';

export default function TicketsPage(){
  const [open,setOpen]=useState(false);
  const rows=ticketRows.map(r=>[...r,<div className="action-group"><button className="small-icon"><Icon name="eye" size={15}/></button><button className="small-icon"><Icon name="edit" size={15}/></button></div>]);
  return <>
    <PageHeader title="Tickets" subtitle="Manage bookings, payments, cost and margin across both branches." actions={<Button icon="plus" onClick={()=>setOpen(true)}>New Ticket</Button>}/>
    <div className="filter-row"><SearchField placeholder="Search by reference, passenger, route, PNR..."/><FilterField value="All Branches" icon="building"/><FilterField value="May 1 – May 31, 2025" icon="calendar"/><Button variant="secondary" icon="filter">Filters</Button></div>
    <div className="subtabs"><button className="active">All Tickets 152</button><button>Issued 98</button><button>Pending Payment 18</button><button>Ticketed 84</button><button>Pending Refund 7</button><button>Cancelled 11</button></div>
    <div className="metrics-grid">
      <MetricCard icon="ticket" label="Tickets Issued" value="328" delta="↑ 13.8%" tone="blue" foot="vs Apr 1 – Apr 30"/>
      <MetricCard icon="money" label="Revenue" value="USD 66,540" delta="↑ 18.6%" tone="cyan" foot="vs Apr 1 – Apr 30"/>
      <MetricCard icon="trend" label="Gross Profit" value="USD 18,420" delta="↑ 21.4%" tone="green" foot="vs Apr 1 – Apr 30"/>
      <MetricCard icon="wallet" label="Pending Refunds" value="USD 2,860" delta="- 6.2%" tone="orange" foot="vs Apr 1 – Apr 30"/>
    </div>
    <Panel title="Ticket Register" actions={<StatusBadge tone="blue">Live</StatusBadge>} className="" >
      <DataTable columns={['Reference','Passenger','Route','Travel Date','Type','Office','Sale Amount','Agency Cost','Profit','Payment','Status','Actions']} rows={rows}/><Pagination/>
    </Panel>
    {open&&<Modal title="Create Ticket" subtitle="Record booking, sale, payment and margin details." onClose={()=>setOpen(false)} side={<div><h3>Profit Summary</h3><div className="summary-eq"><span className="muted">Sale Amount</span><div className="big">USD 0.00</div><div className="muted">minus</div><span className="muted">Agency Cost</span><div className="big">USD 0.00</div><hr style={{border:0,borderTop:'1px solid #dbe4ef'}}/><span className="muted">Gross Profit</span><div className="big green">USD 0.00</div></div></div>}>
      <FormGrid><Field label="Branch" value="Mogadishu Office" icon="building"/><Field label="Type" value="Sale" icon="ticket"/><Field label="Sale Date" value="09/01/2026" icon="calendar"/><Field label="Travel Date" placeholder="mm/dd/yyyy" icon="calendar"/><Field label="Passenger Name" placeholder="Enter passenger name" icon="user"/><Field label="Phone" placeholder="Enter phone number" icon="phone"/><Field label="From" value="NBO–DXB" icon="plane"/><Field label="To" placeholder="Enter destination" icon="plane"/><Field label="Currency" value="USD" icon="money"/><Field label="Sale Amount" placeholder="Enter sale amount" icon="money"/><Field label="Agency Cost" placeholder="Enter agency cost" icon="wallet"/><Field label="Payment Method" value="EVC Plus" icon="wallet"/><TextAreaField label="Notes"/></FormGrid>
      <div className="modal-actions"><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button icon="ticket">Create Ticket</Button></div>
    </Modal>}
  </>
}
