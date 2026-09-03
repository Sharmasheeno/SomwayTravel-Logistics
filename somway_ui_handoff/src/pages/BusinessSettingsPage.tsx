import React from 'react';
import { Button, DataTable, Field, FormGrid, PageHeader, Panel, StatusBadge } from '../components/UI';
import { Icon } from '../icons';

export default function BusinessSettingsPage(){const rows=[['Mogadishu Office',<StatusBadge tone="green">Active</StatusBadge>,'MOG','Mogadishu, Somalia','USD',actions()],['Nairobi Office',<StatusBadge tone="green">Active</StatusBadge>,'NBO','Nairobi, Kenya','KES + USD',actions()]];return <>
 <PageHeader title="Business Settings" subtitle="Manage your business day, branch locations, and operational configuration."/>
 <Panel title="Business Day" subtitle="Define the working hours and timezone for your business operations."><FormGrid><Field label="Timezone" value="Africa/Mogadishu"/><Field label="Day starts" value="07:00 AM" icon="clock"/><Field label="Day ends" value="06:00 PM" icon="clock"/></FormGrid><div className="modal-actions"><Button>Save Business Hours</Button></div></Panel>
 <Panel title="Branch Management" subtitle="Manage your business branches and their operational details." actions={<Button variant="secondary" icon="plus">Add Branch</Button>}><DataTable columns={['Branch Name','Status','Branch Code','Location','Currency','Actions']} rows={rows}/></Panel>
 </>}
function actions(){return <div className="action-group"><Button variant="secondary" icon="edit">Edit</Button><Button variant="danger" icon="trash">Deactivate</Button></div>}
