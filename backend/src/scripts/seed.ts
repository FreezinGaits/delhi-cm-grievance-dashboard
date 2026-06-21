import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User, UserRole } from '../models/User';
import { Department } from '../models/Department';
import { Complaint, ComplaintStatus, ComplaintPriority, ComplaintSource } from '../models/Complaint';
import { ComplaintHistory, HistoryAction } from '../models/ComplaintHistory';
import { Assignment } from '../models/Assignment';
import { OfficerMetrics } from '../models/OfficerMetrics';
import { DepartmentMetrics } from '../models/DepartmentMetrics';

/**
 * Seed script — populates the database with realistic demo data
 * Run: npx tsx src/scripts/seed.ts
 */

// Delhi coordinates center
const DELHI_CENTER = { lat: 28.6139, lng: 77.2090 };

function randomCoord(center: { lat: number; lng: number }, spreadKm: number) {
  const spread = spreadKm / 111; // ~111km per degree
  return {
    lat: center.lat + (Math.random() - 0.5) * spread * 2,
    lng: center.lng + (Math.random() - 0.5) * spread * 2,
  };
}

const COMPLAINT_CATEGORIES = [
  { category: 'Water Supply', subcategories: ['Pipe Burst', 'Contamination', 'Low Pressure', 'No Supply'], dept: 'DJB' },
  { category: 'Roads', subcategories: ['Pothole', 'Broken Pavement', 'Waterlogging', 'Damaged Divider'], dept: 'PWD' },
  { category: 'Sanitation', subcategories: ['Garbage Pile', 'Sewer Overflow', 'Open Drain', 'Street Cleaning'], dept: 'MCD' },
  { category: 'Electricity', subcategories: ['Power Outage', 'Streetlight', 'Dangling Wire', 'Transformer Issue'], dept: 'BSES' },
  { category: 'Law & Order', subcategories: ['Illegal Encroachment', 'Noise Complaint', 'Suspicious Activity', 'Traffic Violation'], dept: 'POLICE' },
];

const DELHI_DISTRICTS = ['North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi', 'New Delhi', 'Shahdara', 'North East Delhi', 'South East Delhi', 'South West Delhi', 'North West Delhi'];
const DELHI_WARDS = ['Karol Bagh', 'Rohini', 'Dwarka', 'Saket', 'Lajpat Nagar', 'Chandni Chowk', 'Connaught Place', 'Vasant Kunj', 'Janakpuri', 'Pitampura', 'Rajouri Garden', 'Nehru Place'];

async function seed() {
  console.log('🌱 Starting database seed...\n');

  await connectDatabase();

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Complaint.deleteMany({}),
    ComplaintHistory.deleteMany({}),
    Assignment.deleteMany({}),
    OfficerMetrics.deleteMany({}),
    DepartmentMetrics.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // ── Create CM User ──
  console.log('👤 Creating CM user...');
  const cmUser = await User.create({
    name: { first: 'Arvind', last: 'Kumar' },
    email: 'cm@delhi.gov.in',
    phone: '+919000000001',
    role: UserRole.CM,
    passwordHash,
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    preferences: { language: 'en', notificationChannels: ['push', 'email'] },
  });

  // ── Create Admin User ──
  console.log('👤 Creating admin user...');
  await User.create({
    name: { first: 'System', last: 'Admin' },
    email: 'admin@delhi.gov.in',
    phone: '+919000000002',
    role: UserRole.ADMIN,
    passwordHash,
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    preferences: { language: 'en', notificationChannels: ['email'] },
  });

  // ── Create Departments ──
  console.log('🏢 Creating departments...');
  const departmentData = [
    {
      name: 'Delhi Jal Board',
      code: 'DJB',
      description: 'Responsible for water supply, sewage disposal, and water treatment in Delhi',
      categories: ['Water Supply'],
      contactEmail: 'djb@delhi.gov.in',
      contactPhone: '+911123890100',
      slaDefaults: { normal: 72, high: 24, critical: 4 },
      routingRules: [
        { category: 'Water Supply', keywords: ['water', 'pipe', 'supply', 'contamination', 'pressure', 'leak', 'sewer'], priority: 'normal' as const, autoAssign: true },
        { category: 'Water Supply', subcategory: 'Contamination', keywords: ['contamination', 'dirty water', 'brown water'], priority: 'high' as const, autoAssign: true },
      ],
      jurisdiction: { wards: DELHI_WARDS.slice(0, 6), zones: ['Zone A', 'Zone B'], districts: DELHI_DISTRICTS.slice(0, 4) },
    },
    {
      name: 'Public Works Department',
      code: 'PWD',
      description: 'Responsible for construction and maintenance of roads, bridges, and public buildings',
      categories: ['Roads'],
      contactEmail: 'pwd@delhi.gov.in',
      contactPhone: '+911123392100',
      slaDefaults: { normal: 72, high: 24, critical: 4 },
      routingRules: [
        { category: 'Roads', keywords: ['road', 'pothole', 'pavement', 'divider', 'waterlogging', 'bridge'], priority: 'normal' as const, autoAssign: true },
        { category: 'Roads', subcategory: 'Waterlogging', keywords: ['waterlogging', 'flood', 'submerged'], priority: 'high' as const, autoAssign: true },
      ],
      jurisdiction: { wards: DELHI_WARDS.slice(3, 9), zones: ['Zone B', 'Zone C'], districts: DELHI_DISTRICTS.slice(2, 7) },
    },
    {
      name: 'Municipal Corporation of Delhi',
      code: 'MCD',
      description: 'Responsible for civic amenities, sanitation, and waste management',
      categories: ['Sanitation'],
      contactEmail: 'mcd@delhi.gov.in',
      contactPhone: '+911123220022',
      slaDefaults: { normal: 48, high: 12, critical: 4 },
      routingRules: [
        { category: 'Sanitation', keywords: ['garbage', 'trash', 'waste', 'cleaning', 'drain', 'sewer'], priority: 'normal' as const, autoAssign: true },
        { category: 'Sanitation', subcategory: 'Sewer Overflow', keywords: ['sewer overflow', 'sewage', 'manhole'], priority: 'critical' as const, autoAssign: true },
      ],
      jurisdiction: { wards: DELHI_WARDS, zones: ['Zone A', 'Zone B', 'Zone C'], districts: DELHI_DISTRICTS },
    },
    {
      name: 'BSES Rajdhani / Yamuna Power',
      code: 'BSES',
      description: 'Electricity distribution and supply management',
      categories: ['Electricity'],
      contactEmail: 'bses@delhi.gov.in',
      contactPhone: '+911139999707',
      slaDefaults: { normal: 24, high: 8, critical: 2 },
      routingRules: [
        { category: 'Electricity', keywords: ['power', 'electricity', 'outage', 'streetlight', 'transformer', 'wire'], priority: 'normal' as const, autoAssign: true },
        { category: 'Electricity', subcategory: 'Dangling Wire', keywords: ['dangling wire', 'live wire', 'exposed wire', 'electrocution'], priority: 'critical' as const, autoAssign: true },
      ],
      jurisdiction: { wards: DELHI_WARDS.slice(0, 8), zones: ['Zone A', 'Zone B'], districts: DELHI_DISTRICTS.slice(0, 6) },
    },
    {
      name: 'Delhi Police',
      code: 'POLICE',
      description: 'Law enforcement and public safety',
      categories: ['Law & Order'],
      contactEmail: 'police@delhi.gov.in',
      contactPhone: '+911123490200',
      slaDefaults: { normal: 48, high: 12, critical: 1 },
      routingRules: [
        { category: 'Law & Order', keywords: ['encroachment', 'noise', 'suspicious', 'traffic', 'crime', 'theft'], priority: 'normal' as const, autoAssign: true },
        { category: 'Law & Order', subcategory: 'Suspicious Activity', keywords: ['suspicious', 'threat', 'danger'], priority: 'high' as const, autoAssign: true },
      ],
      jurisdiction: { wards: DELHI_WARDS, zones: ['Zone A', 'Zone B', 'Zone C'], districts: DELHI_DISTRICTS },
    },
  ];

  const departments = await Department.insertMany(departmentData);
  const deptMap = new Map(departments.map((d) => [d.code, d]));

  // ── Create Officers (4 per department = 20) ──
  console.log('👮 Creating officers...');
  const officerNames = [
    ['Rajesh', 'Verma'], ['Priya', 'Singh'], ['Amit', 'Gupta'], ['Sunita', 'Yadav'],
    ['Vikram', 'Sharma'], ['Anita', 'Jha'], ['Deepak', 'Mishra'], ['Kavita', 'Rao'],
    ['Suresh', 'Patel'], ['Neha', 'Kapoor'], ['Rakesh', 'Chauhan'], ['Pooja', 'Mehta'],
    ['Manoj', 'Tiwari'], ['Ritu', 'Agarwal'], ['Sanjay', 'Saxena'], ['Divya', 'Nair'],
    ['Arun', 'Reddy'], ['Meera', 'Bhatt'], ['Nikhil', 'Joshi'], ['Simran', 'Kaur'],
  ];

  const officers: mongoose.Document[] = [];
  let phoneCounter = 100;

  for (let i = 0; i < departments.length; i++) {
    const dept = departments[i];
    for (let j = 0; j < 4; j++) {
      const idx = i * 4 + j;
      const [first, last] = officerNames[idx];
      const role = j === 0 ? UserRole.DEPARTMENT_HEAD : UserRole.OFFICER;
      const officer = await User.create({
        name: { first, last },
        email: `${first.toLowerCase()}.${last.toLowerCase()}@delhi.gov.in`,
        phone: `+9190000${String(phoneCounter++).padStart(5, '0')}`,
        role,
        departmentId: dept._id,
        ward: DELHI_WARDS[idx % DELHI_WARDS.length],
        passwordHash,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        preferences: { language: 'en', notificationChannels: ['push', 'email'] },
      });
      officers.push(officer);

      // Set first officer as department head
      if (j === 0) {
        await Department.findByIdAndUpdate(dept._id, { headOfficer: officer._id });
      }
    }
  }

  // ── Create Citizens (10) ──
  console.log('🧑 Creating citizen users...');
  const citizenNames = [
    ['Rohit', 'Kumar'], ['Sneha', 'Devi'], ['Manish', 'Pandey'], ['Anjali', 'Banerjee'],
    ['Vivek', 'Chopra'], ['Komal', 'Thakur'], ['Harsh', 'Malhotra'], ['Nisha', 'Dubey'],
    ['Gaurav', 'Soni'], ['Sakshi', 'Garg'],
  ];

  const citizens: mongoose.Document[] = [];
  for (let i = 0; i < citizenNames.length; i++) {
    const [first, last] = citizenNames[i];
    const citizen = await User.create({
      name: { first, last },
      email: `${first.toLowerCase()}.${last.toLowerCase()}@gmail.com`,
      phone: `+9198765${String(43210 + i).padStart(5, '0')}`,
      role: UserRole.CITIZEN,
      passwordHash,
      isActive: true,
      isPhoneVerified: true,
      preferences: { language: i % 2 === 0 ? 'en' : 'hi', notificationChannels: ['sms', 'whatsapp'] },
    });
    citizens.push(citizen);
  }

  // ── Create Complaints (100) ──
  console.log('📝 Creating 100 sample complaints...');
  const statuses = Object.values(ComplaintStatus);
  const complaints: mongoose.Document[] = [];

  for (let i = 0; i < 100; i++) {
    let catInfo = COMPLAINT_CATEGORIES[i % COMPLAINT_CATEGORIES.length];
    let subcat = catInfo.subcategories[i % catInfo.subcategories.length];
    let coord = randomCoord(DELHI_CENTER, 15);
    let status = statuses[i % statuses.length];

    // Every 10th complaint, force a cluster (same category, very close coordinates, unresolved status)
    if (i > 0 && i % 10 === 0) {
      const prev = complaints[i - 1] as any;
      const prevCatInfo = COMPLAINT_CATEGORIES.find((c) => c.category === prev.category);
      if (prevCatInfo) {
        catInfo = prevCatInfo;
        subcat = prev.subcategory;
        coord = {
          lng: prev.location.coordinates[0] + (Math.random() - 0.5) * 0.0002,
          lat: prev.location.coordinates[1] + (Math.random() - 0.5) * 0.0002,
        };
        const unresolvedList = [ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS];
        status = unresolvedList[i % unresolvedList.length];
        
        if (!unresolvedList.includes(prev.status)) {
          prev.status = ComplaintStatus.ASSIGNED;
          await prev.save();
        }
      }
    }

    const dept = deptMap.get(catInfo.dept)!;
    const deptOfficers = officers.filter((o) => {
      const user = o as unknown as { departmentId: mongoose.Types.ObjectId };
      return user.departmentId?.toString() === dept._id.toString();
    });
    const officer = deptOfficers[i % deptOfficers.length];
    const citizen = citizens[i % citizens.length];
    const isCritical = subcat === 'Dangling Wire' || subcat === 'Sewer Overflow' || subcat === 'Contamination';
    const priority = isCritical ? ComplaintPriority.CRITICAL : i % 4 === 0 ? ComplaintPriority.HIGH : ComplaintPriority.NORMAL;

    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(Date.now() - daysAgo * 86400000);
    const slaHours = isCritical ? dept.slaDefaults.critical : priority === 'high' ? dept.slaDefaults.high : dept.slaDefaults.normal;
    const slaDeadline = new Date(createdAt.getTime() + slaHours * 3600000);

    const refNum = `DEL-${createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(5, '0')}`;

    const complaint = await Complaint.create({
      referenceNumber: refNum,
      citizenId: citizen._id,
      title: `${subcat} issue in ${DELHI_WARDS[i % DELHI_WARDS.length]}`,
      description: `There is a serious ${subcat.toLowerCase()} problem near my residence in ${DELHI_WARDS[i % DELHI_WARDS.length]}. This has been causing inconvenience to residents for several days. Urgent action is needed.`,
      category: catInfo.category,
      subcategory: subcat,
      status,
      priority,
      location: { type: 'Point', coordinates: [coord.lng, coord.lat] },
      address: {
        ward: DELHI_WARDS[i % DELHI_WARDS.length],
        district: DELHI_DISTRICTS[i % DELHI_DISTRICTS.length],
        fullAddress: `Block ${String.fromCharCode(65 + (i % 10))}, ${DELHI_WARDS[i % DELHI_WARDS.length]}, Delhi`,
      },
      assignedDepartment: dept._id,
      assignedOfficer: officer._id,
      sla: { deadline: slaDeadline, breached: slaDeadline < new Date(), breachedAt: slaDeadline < new Date() ? slaDeadline : undefined },
      isCritical,
      criticalReason: isCritical ? `Auto-detected critical: ${subcat}` : undefined,
      source: Object.values(ComplaintSource)[i % 3],
      tags: [catInfo.category.toLowerCase(), subcat.toLowerCase()],
      createdAt,
      updatedAt: createdAt,
    });
    complaints.push(complaint);

    // Create history entry
    await ComplaintHistory.create({
      complaintId: complaint._id,
      action: HistoryAction.CREATED,
      toStatus: ComplaintStatus.SUBMITTED,
      performedBy: citizen._id,
      notes: 'Complaint submitted by citizen',
      createdAt,
    });
  }

  // ── Create Assignments ──
  console.log('📋 Creating assignments...');
  for (const complaint of complaints) {
    const c = complaint as unknown as { assignedOfficer: mongoose.Types.ObjectId; assignedDepartment: mongoose.Types.ObjectId; priority: string };
    if (c.assignedOfficer) {
      await Assignment.create({
        complaintId: complaint._id,
        officerId: c.assignedOfficer,
        departmentId: c.assignedDepartment,
        status: 'accepted',
        priority: c.priority,
      });
    }
  }

  // ── Summary ──
  const totalUsers = await User.countDocuments();
  const totalDepts = await Department.countDocuments();
  const totalComplaints = await Complaint.countDocuments();

  console.log(`
╔══════════════════════════════════════════╗
║         🌱 SEED COMPLETE                ║
╠══════════════════════════════════════════╣
║  Users:        ${String(totalUsers).padEnd(25)}║
║  Departments:  ${String(totalDepts).padEnd(25)}║
║  Complaints:   ${String(totalComplaints).padEnd(25)}║
╠══════════════════════════════════════════╣
║  Login Credentials (all roles):         ║
║  Password: Password123!                 ║
║                                         ║
║  CM:    cm@delhi.gov.in                 ║
║  Admin: admin@delhi.gov.in              ║
║  Officer: rajesh.verma@delhi.gov.in     ║
║  Citizen: rohit.kumar@gmail.com         ║
╚══════════════════════════════════════════╝
  `);

  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
