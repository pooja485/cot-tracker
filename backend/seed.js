// backend/seed.js — Seed the database with demo companies
const { initDB, createCompany } = require('./db');

const demoData = [
  {company:'Nexora Technologies',city:'San Francisco',industry:'Technology',contact:'Lena Marsh',email:'lena.marsh@nexora.io',phone:'+1 415 234 5678',status:'Interested',emailSent:true,reply:true,interested:true,dataSent:true,msgSent:true,followup:false,assigned:'James Dawson',lastContacted:'2025-05-10',nextFollowup:'2025-05-18',notes:'Highly interested in platform demo. Schedule follow-up call.'},
  {company:'Alpine Finance Group',city:'New York',industry:'Finance',contact:'Derek Stone',email:'d.stone@alpinefinance.com',phone:'+1 212 876 5432',status:'Email Sent',emailSent:true,reply:false,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'Sarah Kim',lastContacted:'2025-05-08',nextFollowup:'2025-05-19',notes:'Sent initial outreach email. No reply yet.'},
  {company:'Greenfield Health',city:'Chicago',industry:'Healthcare',contact:'Priya Nair',email:'priya@greenfieldhealth.org',phone:'+1 312 555 0100',status:'Replied',emailSent:true,reply:true,interested:false,dataSent:false,msgSent:true,followup:false,assigned:'Ali Raza',lastContacted:'2025-05-11',nextFollowup:'2025-05-20',notes:'Replied asking for product brochure.'},
  {company:'Orion Retail Co.',city:'Los Angeles',industry:'Retail',contact:'Sam Nguyen',email:'sam.n@orionretail.com',phone:'+1 310 444 9900',status:'Not Contacted',emailSent:false,reply:false,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'Nina Patel',lastContacted:'',nextFollowup:'2025-05-21',notes:''},
  {company:'Vertex Manufacturing',city:'Detroit',industry:'Manufacturing',contact:'Bob Krauss',email:'b.krauss@vertexmfg.com',phone:'+1 313 221 7700',status:'Contacted',emailSent:true,reply:false,interested:false,dataSent:false,msgSent:true,followup:false,assigned:'Tom Brooks',lastContacted:'2025-05-07',nextFollowup:'2025-05-22',notes:'Called Bob directly. Left voicemail.'},
  {company:'Sunrise Real Estate',city:'Miami',industry:'Real Estate',contact:'Julia Velez',email:'julia@sunriserealty.com',phone:'+1 305 999 2200',status:'Data Sent',emailSent:true,reply:true,interested:true,dataSent:true,msgSent:false,followup:false,assigned:'James Dawson',lastContacted:'2025-05-09',nextFollowup:'2025-05-23',notes:'Sent product catalogue. Awaiting decision.'},
  {company:'Axon Logistics Ltd',city:'Dallas',industry:'Logistics',contact:'Marcus Webb',email:'m.webb@axonlogistics.com',phone:'+1 469 333 1111',status:'Message Sent',emailSent:true,reply:false,interested:false,dataSent:false,msgSent:true,followup:false,assigned:'Sarah Kim',lastContacted:'2025-05-06',nextFollowup:'2025-05-24',notes:'LinkedIn message sent.'},
  {company:'Brightpath Education',city:'Boston',industry:'Education',contact:'Amy Chong',email:'amy.chong@brightpath.edu',phone:'+1 617 888 4422',status:'Follow-up Sent',emailSent:true,reply:true,interested:true,dataSent:true,msgSent:true,followup:true,assigned:'Ali Raza',lastContacted:'2025-05-12',nextFollowup:'2025-05-17',notes:'Second follow-up sent. Very interested in training module.'},
  {company:'Meridian Media',city:'Atlanta',industry:'Media',contact:'Chris Parker',email:'c.parker@meridianmedia.tv',phone:'+1 404 777 3300',status:'Interested',emailSent:true,reply:true,interested:true,dataSent:false,msgSent:false,followup:false,assigned:'Nina Patel',lastContacted:'2025-05-10',nextFollowup:'2025-05-19',notes:'Looking for a long-term partnership.'},
  {company:'Cascade Software Inc.',city:'Seattle',industry:'Technology',contact:'Rachel Tan',email:'rachel@cascadesoft.io',phone:'+1 206 654 3210',status:'Email Sent',emailSent:true,reply:false,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'Tom Brooks',lastContacted:'2025-05-05',nextFollowup:'2025-05-25',notes:''},
  {company:'Summit Healthcare Partners',city:'Denver',industry:'Healthcare',contact:'Tom Henderson',email:'t.henderson@summithp.com',phone:'+1 720 888 0055',status:'Not Contacted',emailSent:false,reply:false,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'James Dawson',lastContacted:'',nextFollowup:'2025-05-30',notes:'Referred by Greenfield Health.'},
  {company:'Pacific Finance Corp',city:'San Francisco',industry:'Finance',contact:'Mia Thompson',email:'mia@pacificfinance.com',phone:'+1 415 543 2200',status:'Contacted',emailSent:true,reply:false,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'Sarah Kim',lastContacted:'2025-05-03',nextFollowup:'2025-05-21',notes:''},
  {company:'Ironclad Manufacturing',city:'Houston',industry:'Manufacturing',contact:'Dave Martinez',email:'d.martinez@ironclad.com',phone:'+1 713 222 9988',status:'Replied',emailSent:true,reply:true,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'Ali Raza',lastContacted:'2025-05-11',nextFollowup:'2025-05-20',notes:'Positive reply. Needs pricing sheet.'},
  {company:'Nova Digital Agency',city:'New York',industry:'Media',contact:'Ellen Park',email:'ellen@novadigital.co',phone:'+1 646 321 4455',status:'Data Sent',emailSent:true,reply:true,interested:true,dataSent:true,msgSent:false,followup:false,assigned:'Tom Brooks',lastContacted:'2025-05-09',nextFollowup:'2025-05-26',notes:''},
  {company:'Urban Logistics Hub',city:'Chicago',industry:'Logistics',contact:'Kevin Shaw',email:'k.shaw@urbanlogistics.com',phone:'+1 312 645 8800',status:'Contacted',emailSent:true,reply:false,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'Nina Patel',lastContacted:'2025-05-08',nextFollowup:'2025-05-27',notes:''},
];

async function seed() {
  await initDB();
  console.log('🌱 Seeding database with demo data...');
  for (const company of demoData) {
    createCompany(company);
  }
  console.log(`✅ Seeded ${demoData.length} companies successfully.`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
