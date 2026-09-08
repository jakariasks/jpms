export const studentFields = [
  { name: 'name', label: 'Student name', required: true, maxLength: 120 },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'guardian_name', label: 'Guardian name', maxLength: 120 },
  { name: 'class', label: 'Class', required: true, placeholder: '10 / SSC' },
  { name: 'subject', label: 'Subject', required: true },
  {
    name: 'monthly_fee',
    label: 'Monthly fee (BDT)',
    type: 'number',
    required: true,
    min: 0,
    step: '.01',
  },
  { name: 'joining_date', label: 'Joining date', type: 'date', required: true },
  { name: 'schedule_time', label: 'Class time (profile timezone)', type: 'time' },
  { name: 'schedule_days', label: 'Class days', type: 'days', wide: true },
  { name: 'address', label: 'Address', type: 'textarea', wide: true },
  {
    name: 'active',
    label: 'Active student',
    type: 'checkbox',
    note: 'Archive to stop future invoices and keep history.',
  },
];
export const memberFields = [
  { name: 'student_name', label: 'Student name', required: true, maxLength: 120 },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'guardian_name', label: 'Guardian name', maxLength: 120 },
  {
    name: 'monthly_fee',
    label: 'Monthly fee (BDT)',
    type: 'number',
    required: true,
    min: 0,
    step: '.01',
  },
  { name: 'joining_date', label: 'Joining date', type: 'date', required: true },
  { name: 'active', label: 'Active enrolment', type: 'checkbox' },
  { name: 'address', label: 'Address', type: 'textarea', wide: true },
];
export const batchFields = [
  { name: 'batch_name', label: 'Batch name', required: true, maxLength: 120, wide: true },
  { name: 'class', label: 'Class', required: true },
  { name: 'subject', label: 'Subject', required: true },
  {
    name: 'schedule',
    label: 'Schedule notes',
    type: 'textarea',
    wide: true,
    placeholder: 'Room, duration or other arrangements',
  },
  { name: 'schedule_days', label: 'Class days', type: 'days', wide: true },
  { name: 'schedule_time', label: 'Class time (profile timezone)', type: 'time' },
  { name: 'active', label: 'Active batch', type: 'checkbox' },
];
export function teachingValues(values) {
  const output = { ...values };
  if ('schedule_days' in output) output.schedule_days = (output.schedule_days || []).map(Number);
  if ('schedule_time' in output) output.schedule_time = output.schedule_time || null;
  for (const key of ['name', 'student_name', 'batch_name', 'class', 'subject'])
    if (key in output) output[key] = output[key].trim();
  return output;
}
export function teachingDefaults(row = {}, today) {
  return {
    name: '',
    student_name: '',
    batch_name: '',
    phone: '',
    guardian_name: '',
    class: '',
    subject: '',
    address: '',
    schedule: '',
    monthly_fee: '',
    joining_date: today,
    active: true,
    schedule_time: '',
    ...row,
    schedule_days: (row.schedule_days || []).map(String),
  };
}
