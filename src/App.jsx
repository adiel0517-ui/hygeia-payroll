import { useState, useMemo, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS — verified against Prime Contract Exhibit A & Adiel_Copy.xlsx
// ═══════════════════════════════════════════════════════════════════════
const FACTOR = 313 / 24; // 13.0417 semi-monthly day factor
const ADMIN_FEE = 0.10;
const VAT = 0.12;

// Employer govt contributions (monthly) — from contract Exhibit A
const GOVT_EMP = {
  janitor:    { sss: 1800.00, philhealth: 453.19,  ec: 30, pagibig: 200 },
  supervisor: { sss: 2171.00, philhealth: 542.75,  ec: 30, pagibig: 200 },
};

// Payroll multipliers (DOLE)
const LH_HRS = 24;    // legal holiday billed as 24 hrs
const SH_PCT = 0.30;  // special holiday: hourly × 30%
const NS_PCT = 0.10;  // night shift: hourly × 10%
const OT_PCT = 1.25;  // overtime: hourly × 125%

// SSS 2025 employee table
function getSSS(m) {
  const t = [[4250,135],[4750,157.5],[5250,180],[5750,202.5],[6250,225],[6750,247.5],[7250,270],[7750,292.5],[8250,315],[8750,337.5],[9250,360],[9750,382.5],[10250,405],[10750,427.5],[11250,450],[11750,472.5],[12250,495],[12750,517.5],[13250,540],[13750,562.5],[14250,585],[14750,607.5],[15250,630],[15750,652.5],[16250,675],[16750,697.5],[17250,720],[17750,742.5],[18250,765],[18750,787.5],[19250,810],[19750,832.5],[20250,855],[20750,877.5],[21250,900],[21750,922.5],[22250,945],[22750,967.5],[23250,990],[23750,1012.5],[24250,1035],[24750,1057.5],[25250,1080],[25750,1102.5],[26250,1125],[26750,1147.5],[27250,1170],[27750,1192.5],[28250,1215],[28750,1237.5],[29250,1260],[29750,1282.5],[30250,1350]];
  for (const [c,v] of t) if (m < c) return v;
  return 1350;
}
const getPH   = (m) => (Math.min(Math.max(m,10000),100000)*0.05)/2;
const getHDMF = (m) => Math.min(m*0.02,100)/2;

// Contract billing daily rate formula
function calcBillingMonthly(dailyPayroll, isSupervisor) {
  const monthly    = dailyPayroll * 313 / 12;
  const m13        = monthly / 12;
  const sil        = dailyPayroll * 5 / 12;
  const totalEmp   = monthly + m13 + sil;
  const adminFee   = totalEmp * ADMIN_FEE;
  const gross      = totalEmp + adminFee;
  const vatAmt     = gross * VAT;
  const govt       = isSupervisor ? GOVT_EMP.supervisor : GOVT_EMP.janitor;
  const totalGovt  = govt.sss + govt.philhealth + govt.ec + govt.pagibig;
  return gross + vatAmt + totalGovt; // exact monthly contract rate
}
function calcBillingDaily(dailyPayroll, isSupervisor) {
  return r2(calcBillingMonthly(dailyPayroll, isSupervisor) / 2 / FACTOR);
}

const r2  = (n) => Math.round((n||0)*100)/100;
const fmt = (n) => "₱" + r2(n).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtN= (n) => r2(n).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2});

const TABS = ["Employees","Loans","Payroll","Payslip","Billing","P&L","Payables"];
const LOAN_TYPES = ["SSS Salary Loan","SSS Calamity Loan","Pag-IBIG MPL","Pag-IBIG Calamity Loan"];
const HOSPITALS = [
  { name:"PRIME HOSPITAL AND MEDICAL CENTER - PASIG INC.", short:"Prime Hospital", address:"San Agustin St. Corner Caruncho Ave., Brgy. Pinagbuhatan, Pasig City", contact:"Col. Agustin A. Zozobrado" },
  { name:"UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", short:"Unihealth Parañaque", address:"Dr. A. Santos Ave., Parañaque City", contact:"" },
];

// ── Initial employees from Adiel_Copy.xlsx ───────────────────────────
const mkEmp = (id,surname,name,dailyPayroll,hospital,isSup,sssNo,phNo,hdmfNo) => ({
  id, surname, name, dailyPayroll,
  monthlyBilling: calcBillingMonthly(dailyPayroll, isSup),
  dailyBilling: calcBillingDaily(dailyPayroll, isSup),
  isSupervisor: isSup, hospital, sssNo, phNo, hdmfNo
});

const INIT_EMP = [
  // ── PRIME HOSPITAL — sorted A→Z by surname ────────────────────────
  mkEmp(1, "BALBIN JR.", "ROMEO",      695, "PRIME HOSPITAL AND MEDICAL CENTER - PASIG INC.", false, "34-1234561-1","12-345678901-1","1234-5678-9001"),
  mkEmp(2, "DACILLO",    "JORDAN",     695, "PRIME HOSPITAL AND MEDICAL CENTER - PASIG INC.", false, "34-1234562-2","12-345678901-2","1234-5678-9002"),
  mkEmp(3, "DIAZ",       "CRESELYN",   695, "PRIME HOSPITAL AND MEDICAL CENTER - PASIG INC.", false, "34-1234563-3","12-345678901-3","1234-5678-9003"),
  mkEmp(4, "GARDIGO",    "JENELITA",   695, "PRIME HOSPITAL AND MEDICAL CENTER - PASIG INC.", false, "34-1234564-4","12-345678901-4","1234-5678-9004"),
  mkEmp(5, "LOLONG",     "ELINOR",     695, "PRIME HOSPITAL AND MEDICAL CENTER - PASIG INC.", false, "34-1234565-5","12-345678901-5","1234-5678-9005"),
  mkEmp(6, "MENDOZA",    "JESSIE",     820, "PRIME HOSPITAL AND MEDICAL CENTER - PASIG INC.", true,  "34-1234560-0","12-345678900-0","1234-5678-9000"),
  mkEmp(7, "PAJOTA",     "HENRY JAMES",695, "PRIME HOSPITAL AND MEDICAL CENTER - PASIG INC.", false, "34-1234566-6","12-345678901-6","1234-5678-9006"),
  mkEmp(8, "PEPITO",     "MARISSA",    695, "PRIME HOSPITAL AND MEDICAL CENTER - PASIG INC.", false, "34-1234567-7","12-345678901-7","1234-5678-9007"),
  mkEmp(9, "REYES",      "MADELYN",    695, "PRIME HOSPITAL AND MEDICAL CENTER - PASIG INC.", false, "34-1234568-8","12-345678901-8","1234-5678-9008"),
  mkEmp(10,"SANDOC",     "REYNANTE",   695, "PRIME HOSPITAL AND MEDICAL CENTER - PASIG INC.", false, "34-1234569-9","12-345678901-9","1234-5678-9009"),
  // ── UNIHEALTH PARAÑAQUE — sorted A→Z by surname ──────────────────
  mkEmp(11,"ABANAG",     "MICO",       695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234562-2","12-445678901-2","2234-5678-9002"),
  mkEmp(12,"CANGAS",     "DOMINADOR",  695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234561-1","12-445678901-1","2234-5678-9001"),
  mkEmp(13,"CLARIÑO",    "ANGELA",     695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234563-3","12-445678901-3","2234-5678-9003"),
  mkEmp(14,"FAJARDO",    "CHRISTIAN",  695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234564-4","12-445678901-4","2234-5678-9004"),
  mkEmp(15,"FAJARDO",    "ODEZA",      695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234565-5","12-445678901-5","2234-5678-9005"),
  mkEmp(16,"GARNACE",    "REYNALDA",   695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234563-0","12-445678900-3","2234-5678-9012"),
  mkEmp(17,"GLOCENO",    "NANCY",      695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234566-6","12-445678901-6","2234-5678-9006"),
  mkEmp(18,"HIZON",      "PAULINO",    695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234567-7","12-445678901-7","2234-5678-9007"),
  mkEmp(19,"JAMITO",     "PRIMITIVO",  695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234564-0","12-445678900-4","2234-5678-9013"),
  mkEmp(20,"MALINGKIS",  "JONIE",      695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234562-0","12-445678900-2","2234-5678-9011"),
  mkEmp(21,"MANILA",     "ALMA",       695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234565-0","12-445678900-5","2234-5678-9014"),
  mkEmp(22,"MECHA",      "EVANGELINE", 695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234561-0","12-445678900-1","2234-5678-9010"),
  mkEmp(23,"PAHIT",      "LEORIZA",    695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234560-0","12-445678900-0","2234-5678-9000"),
  mkEmp(24,"TABOTABO",   "MARY JANE",  695, "UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234568-8","12-445678901-8","2234-5678-9008"),
  mkEmp(25,"URIBE",      "MAYBELLE JANE",695,"UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER", false,"34-2234569-9","12-445678901-9","2234-5678-9009"),
];

const INIT_LOANS = [
  // ── PRIME HOSPITAL ─────────────────────────────────────────────────
  // BALBIN JR., ROMEO (id:1) — Pag-IBIG MPL, DV: 02/11/2026, 36 months
  { id:101, empId:1,  type:"Pag-IBIG MPL",          monthly:563.81, balance:15243.56, startMonth:"2026-05" },
  // DIAZ, CRESELYN (id:3) — SSS Salary + Pag-IBIG MPL (pre-hire 12/05/2025)
  { id:102, empId:3,  type:"SSS Salary Loan",        monthly:1968,   balance:10000,   startMonth:"2025-12" },
  { id:103, empId:3,  type:"Pag-IBIG MPL",           monthly:750,    balance:5000,    startMonth:"2025-12" },
  // MENDOZA, JESSIE (id:6) — SSS Salary Loan (pre-hire 02/16/2026)
  { id:105, empId:6,  type:"SSS Salary Loan",        monthly:716,    balance:5000,    startMonth:"2026-02" },
  // SANDOC, REYNANTE (id:10) — SSS Salary Loan
  { id:104, empId:10, type:"SSS Salary Loan",        monthly:1431,   balance:8000,    startMonth:"2025-12" },

  // ── UNIHEALTH PARAÑAQUE ────────────────────────────────────────────
  // CLARIÑO, ANGELA (id:13) — SSS Salary + Pag-IBIG Calamity
  { id:201, empId:13, type:"SSS Salary Loan",        monthly:2826,   balance:15000,   startMonth:"2025-12" },
  { id:202, empId:13, type:"Pag-IBIG Calamity Loan", monthly:2848,   balance:10419.61,startMonth:"2025-12" },
  // FAJARDO, CHRISTIAN (id:14) — SSS Calamity Loan
  { id:203, empId:14, type:"SSS Calamity Loan",      monthly:1524,   balance:8000,    startMonth:"2026-01" },
  // FAJARDO, ODEZA (id:15) — SSS Salary Loan
  { id:204, empId:15, type:"SSS Salary Loan",        monthly:1584,   balance:4972.76, startMonth:"2026-01" },
  // GARNACE, REYNALDA (id:16) — SSS Calamity + SSS Salary
  { id:205, empId:16, type:"SSS Calamity Loan",      monthly:1610,   balance:6447.15, startMonth:"2025-08" },
  { id:206, empId:16, type:"SSS Salary Loan",        monthly:1584,   balance:7000,    startMonth:"2025-12" },
  // HIZON, PAULINO (id:18) — SSS Calamity + SSS Salary Loan
  { id:207, empId:18, type:"SSS Calamity Loan",      monthly:1610,   balance:32856.07,startMonth:"2024-11" },
  { id:208, empId:18, type:"SSS Salary Loan",        monthly:3164,   balance:17500,   startMonth:"2025-11" },
  // JAMITO, PRIMITIVO (id:19) — SSS Calamity + SSS Salary
  { id:209, empId:19, type:"SSS Calamity Loan",      monthly:1524,   balance:6977.65, startMonth:"2025-03" },
  { id:210, empId:19, type:"SSS Salary Loan",        monthly:1584,   balance:7000,    startMonth:"2025-12" },
  // MECHA, EVANGELINE (id:22) — SSS Calamity + SSS Salary
  { id:211, empId:22, type:"SSS Calamity Loan",      monthly:1524,   balance:15791.78,startMonth:"2025-09" },
  { id:212, empId:22, type:"SSS Salary Loan",        monthly:3076,   balance:34000,   startMonth:"2025-02" },
  // PAHIT, LEORIZA (id:23) — SSS Calamity + SSS Salary
  { id:213, empId:23, type:"SSS Calamity Loan",      monthly:1524,   balance:10376.78,startMonth:"2025-08" },
  { id:214, empId:23, type:"SSS Salary Loan",        monthly:1494,   balance:7000,    startMonth:"2025-12" },
  // URIBE, MAYBELLE JANE (id:25) — SSS Calamity + SSS Salary
  { id:215, empId:25, type:"SSS Calamity Loan",      monthly:1612,   balance:4297.46, startMonth:"2024-10" },
  { id:216, empId:25, type:"SSS Salary Loan",        monthly:3166,   balance:34000,   startMonth:"2025-12" },
];

// ═══════════════════════════════════════════════════════════════════════
// PAYROLL COMPUTE
// ═══════════════════════════════════════════════════════════════════════
function computePayroll(emp, att, empLoans) {
  const dp      = emp.dailyPayroll;
  const hp      = r2(dp/8);
  const smBasic = r2(dp*FACTOR);
  const monthly = r2(smBasic*2);

  const basicPay   = r2(smBasic - dp*(att.absences||0));
  const lhAmt      = r2(hp*(att.lhHrs||0));
  const shRate     = r2(hp*SH_PCT);
  const shAmt      = r2(shRate*(att.shHrs||0));
  const nsRate     = r2(hp*NS_PCT);
  const nsAmt      = r2(nsRate*(att.nsHrs||0));
  const otRate     = r2(hp*OT_PCT);
  const otAmt      = r2(otRate*(att.otHrs||0));
  const straightAmt= r2(hp*(att.straightHrs||0));  // straight duty: hourly × 1.0
  const extraAmt   = r2(dp*(att.extraDays||0));    // day-off relief: daily × days
  const adjustment = r2(att.adjustment||0);
  const subTotal   = r2(basicPay+lhAmt+shAmt+nsAmt+otAmt+straightAmt+extraAmt+adjustment);

  const sss        = r2(getSSS(monthly)/2);
  const philhealth = r2(getPH(monthly));
  const hdmf       = r2(getHDMF(monthly));

  const sssLoans  = empLoans.filter(l=>l.type.includes("SSS")).reduce((s,l)=>s+r2((l.monthly||0)/2),0);
  const hdmfLoans = empLoans.filter(l=>l.type.includes("Pag-IBIG")).reduce((s,l)=>s+r2((l.monthly||0)/2),0);
  const totalLoans= r2(sssLoans+hdmfLoans);
  const medFee    = r2(att.medFee||0);
  const vale      = r2(att.vale||0);
  const utAmt     = r2((hp/60)*(att.utMins||0));
  const totalDed  = r2(sss+philhealth+hdmf+totalLoans+medFee+vale+utAmt);
  const netPay    = r2(subTotal-totalDed);

  return { dp, hp, smBasic, monthly, basicPay, lhAmt, shRate, shAmt, nsRate, nsAmt, otRate, otAmt, straightAmt, extraAmt, adjustment, subTotal, sss, philhealth, hdmf, sssLoans, hdmfLoans, totalLoans, medFee, vale, utAmt, totalDed, netPay };
}

// ═══════════════════════════════════════════════════════════════════════
// BILLING COMPUTE — matches actual Unihealth billing sheet exactly
// SH rate = 38.87/hr (billing hourly * 0.30), NS rate = 12.96/hr (billing hourly * 0.10)
// These match the actual billing: 129.56 * 0.30 = 38.868 ≈ 38.87, 129.56 * 0.10 = 12.956 ≈ 12.96
// ═══════════════════════════════════════════════════════════════════════
function computeBilling(emp, att) {
  const db  = emp.dailyBilling;
  const hb  = r2(db/8);
  const hp  = r2(emp.dailyPayroll/8); // payroll hourly rate
  // Semi-monthly basic comes from monthly contract rate / 2 directly
  // NOT from daily * FACTOR (which loses precision due to rounding of daily)
  const smb = r2(emp.monthlyBilling / 2);

  const basicBill = r2(smb - db*(att.absences||0));
  const lhBill    = r2(hb*(att.lhHrs||0));
  const shRateB   = r2(hb*SH_PCT);           // billing SH = billing hourly × 30% (38.87)
  const shBill    = r2(shRateB*(att.shHrs||0));
  // NS rate differs per hospital contract:
  // PRIME:     payroll hourly × 11% = 86.875 × 0.11 = 9.56
  // UNIHEALTH: billing hourly × 10% = 129.56 × 0.10 = 12.96
  const isPrime   = emp.hospital.includes("PRIME");
  const nsRateB   = isPrime ? r2(hp*0.11) : r2(hb*NS_PCT);
  const nsBill    = r2(nsRateB*(att.nsHrs||0));
  const straightBill = r2(hb*(att.straightHrs||0)); // straight duty hrs × billing hourly
  const extraBill = r2(db*(att.extraDays||0));
  const insurance = r2(att.insurance||0);
  const utRateB   = r2(hb/60);
  const utBill    = r2(utRateB*(att.utMins||0));
  const subTotal  = r2(basicBill+lhBill+shBill+nsBill+straightBill+extraBill+insurance);
  const netBill   = r2(subTotal-utBill);

  return { db, hb, smb, basicBill, lhBill, shRateB, shBill, nsRateB, nsBill, straightBill, extraBill, insurance, utRateB, utBill, subTotal, netBill };
}

// ═══════════════════════════════════════════════════════════════════════
// PRINT STYLES
// ═══════════════════════════════════════════════════════════════════════
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  .printable, .printable * { visibility: visible !important; }
  .printable { position: fixed !important; top: 0; left: 0; width: 100%; z-index: 9999; background: #fff !important; }
  .no-print { display: none !important; }
  @page { margin: 10mm; size: A4; }
}
`;

// ═══════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════
const C = { navy:"#1a3558", teal:"#0a6e55", gold:"#c8972a", light:"#f4f6f9", border:"#dde3ed", red:"#c0392b", amber:"#b45309", green:"#0a6e55", white:"#fff" };

const Inp = ({label,value,onChange,type="text",min,readOnly,placeholder})=>(
  <div>
    {label&&<label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:0.4}}>{label}</label>}
    <input value={value??""} onChange={onChange} type={type} min={min} readOnly={readOnly} placeholder={placeholder}
      style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #dde3ed",fontSize:13,boxSizing:"border-box",background:readOnly?"#f9fafb":"#fff"}}/>
  </div>
);
const Sel = ({label,value,onChange,children})=>(
  <div>
    {label&&<label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:0.4}}>{label}</label>}
    <select value={value??""} onChange={onChange} style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #dde3ed",fontSize:13,background:"#fff"}}>{children}</select>
  </div>
);
const Btn = ({onClick,color=C.navy,children,sm,outline})=>(
  <button onClick={onClick} style={{background:outline?"transparent":color,color:outline?color:"#fff",border:`1.5px solid ${color}`,borderRadius:6,padding:sm?"5px 12px":"9px 18px",fontWeight:700,cursor:"pointer",fontSize:sm?12:13}}>{children}</button>
);
const sumK = (arr,k)=>arr.reduce((s,r)=>s+(r[k]||0),0);

// ═══════════════════════════════════════════════════════════════════════
// PRINTABLE BILLING DOCUMENT
// ═══════════════════════════════════════════════════════════════════════
function PrintBilling({hospName, period, month, invNo, prepBy, rows, onClose}) {
  const hosp = HOSPITALS.find(h=>h.name===hospName)||{name:hospName,address:"",short:""};
  const [d1,d2] = period==="1st"?["1","15"]:["16","31"];
  const monthStr = new Date(month+"-02").toLocaleString("en-PH",{month:"long",year:"numeric"});
  const periodStr = `${monthStr.split(" ")[0].toUpperCase()} ${d1}-${d2}, ${monthStr.split(" ")[1]}`;
  const dateNow = new Date().toLocaleDateString("en-PH",{month:"long",day:"numeric",year:"numeric"});
  const totalNet = sumK(rows,"netBill");

  return (
    <div className="printable" style={{background:"#fff",fontFamily:"'Calibri',Arial,sans-serif",fontSize:10,padding:"6mm 8mm",position:"fixed",top:0,left:0,width:"100%",height:"100%",zIndex:9999,overflow:"auto"}}>
      {/* no-print close */}
      <div className="no-print" style={{display:"flex",gap:10,marginBottom:12}}>
        <Btn onClick={()=>window.print()} color={C.teal}>🖨️ Print</Btn>
        <Btn onClick={onClose} outline color={C.navy}>✕ Close</Btn>
      </div>

      {/* HEADER */}
      <div style={{textAlign:"center",marginBottom:8,borderBottom:"3px double #1a3558",paddingBottom:6}}>
        <div style={{fontSize:15,fontWeight:900,color:C.navy,letterSpacing:1}}>HYGEIA SERVICE PHILIPPINES CORP.</div>
        <div style={{fontSize:9,color:"#555"}}>52 Indonesia St., Better Living Subdivision, Brgy. Don Bosco, Parañaque City, 1700</div>
      </div>

      {/* TO / RE / DATE */}
      <table style={{width:"100%",marginBottom:6,fontSize:10}}>
        <tbody>
          <tr><td style={{width:60,fontWeight:700,color:C.navy}}>TO:</td><td style={{fontWeight:700}}>{hosp.name}</td></tr>
          <tr><td style={{fontWeight:700,color:C.navy}}>RE:</td><td>STATEMENT OF ACCOUNT FOR THE PERIOD &nbsp;<b>{periodStr}</b></td></tr>
          <tr><td style={{fontWeight:700,color:C.navy}}>DATE:</td><td>{dateNow}</td></tr>
        </tbody>
      </table>

      {/* MAIN TABLE */}
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:8.5,marginBottom:8}}>
        <thead>
          <tr style={{background:C.navy,color:"#fff"}}>
            {["#","SURNAME","NAME","BASIC RATE\nS/MONTHLY","DAILY RATE","HOURLY RATE","ABSENCES","BASIC","LH RATE","HRS","LEGAL HOLIDAY","SH RATE","HRS","SPECIAL HOL.","NS RATE","HRS","NIGHT SHIFT","DAYS","EXTRA/\nDAYOFF","SUB-TOTAL","INSURANCE","UT RATE","UT MINS","UT","NET PAY"].map((h,i)=>(
              <th key={i} style={{padding:"4px 4px",textAlign:["#","SURNAME","NAME"].includes(h)?"left":"right",fontWeight:700,whiteSpace:"pre-line",lineHeight:1.2,border:"1px solid #2d5080",fontSize:7.5}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>{
            const a = r.att;
            return (
              <tr key={r.emp.id} style={{background:i%2===0?"#f7f9fc":"#fff",borderBottom:"1px solid #dde3ed"}}>
                <td style={{padding:"3px 4px",textAlign:"left",color:"#888"}}>{i+1}</td>
                <td style={{padding:"3px 4px",fontWeight:700,textAlign:"left"}}>{r.emp.surname}</td>
                <td style={{padding:"3px 4px",textAlign:"left"}}>{r.emp.name}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtN(r.smb)}</td>
                <td style={{padding:"3px 4px",textAlign:"right",fontWeight:700}}>{fmtN(r.db)}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtN(r.hb)}</td>
                <td style={{padding:"3px 4px",textAlign:"right",color:a.absences>0?C.red:""}}>{a.absences||""}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtN(r.basicBill)}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtN(r.hb)}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{a.lhHrs||""}</td>
                <td style={{padding:"3px 4px",textAlign:"right",color:r.lhBill>0?C.navy:""}}>{r.lhBill>0?fmtN(r.lhBill):""}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtN(r.shRateB)}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{a.shHrs||""}</td>
                <td style={{padding:"3px 4px",textAlign:"right",color:r.shBill>0?C.navy:""}}>{r.shBill>0?fmtN(r.shBill):""}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtN(r.nsRateB)}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{a.nsHrs||""}</td>
                <td style={{padding:"3px 4px",textAlign:"right",color:r.nsBill>0?C.navy:""}}>{r.nsBill>0?fmtN(r.nsBill):""}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{a.extraDays||""}</td>
                <td style={{padding:"3px 4px",textAlign:"right",color:r.extraBill>0?C.teal:""}}>{r.extraBill>0?fmtN(r.extraBill):""}</td>
                <td style={{padding:"3px 4px",textAlign:"right",fontWeight:700}}>{fmtN(r.subTotal)}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{r.insurance>0?fmtN(r.insurance):""}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtN(r.utRateB)}</td>
                <td style={{padding:"3px 4px",textAlign:"right"}}>{a.utMins||""}</td>
                <td style={{padding:"3px 4px",textAlign:"right",color:r.utBill>0?C.red:""}}>{r.utBill>0?fmtN(r.utBill):""}</td>
                <td style={{padding:"3px 4px",textAlign:"right",fontWeight:900,color:C.teal}}>{fmtN(r.netBill)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{background:C.navy,color:"#fff",fontWeight:700}}>
            <td colSpan={7} style={{padding:"4px 5px",fontSize:9}}>TOTAL</td>
            <td style={{padding:"4px 4px",textAlign:"right"}}>{fmtN(sumK(rows,"basicBill"))}</td>
            <td></td>
            <td style={{padding:"4px 4px",textAlign:"right"}}>{fmtN(sumK(rows,"lhHrs")||0)}</td>
            <td style={{padding:"4px 4px",textAlign:"right"}}>{fmtN(sumK(rows,"lhBill"))}</td>
            <td></td>
            <td style={{padding:"4px 4px",textAlign:"right"}}>{fmtN(sumK(rows,"shHrs")||0)}</td>
            <td style={{padding:"4px 4px",textAlign:"right"}}>{fmtN(sumK(rows,"shBill"))}</td>
            <td></td>
            <td style={{padding:"4px 4px",textAlign:"right"}}>{fmtN(sumK(rows,"nsHrs")||0)}</td>
            <td style={{padding:"4px 4px",textAlign:"right"}}>{fmtN(sumK(rows,"nsBill"))}</td>
            <td style={{padding:"4px 4px",textAlign:"right"}}>{fmtN(sumK(rows,"extraDays")||0)}</td>
            <td style={{padding:"4px 4px",textAlign:"right"}}>{fmtN(sumK(rows,"extraBill"))}</td>
            <td style={{padding:"4px 4px",textAlign:"right"}}>{fmtN(sumK(rows,"subTotal"))}</td>
            <td style={{padding:"4px 4px",textAlign:"right"}}>{fmtN(sumK(rows,"insurance"))}</td>
            <td></td>
            <td></td>
            <td style={{padding:"4px 4px",textAlign:"right"}}>{fmtN(sumK(rows,"utBill"))}</td>
            <td style={{padding:"4px 4px",textAlign:"right",fontSize:10}}>{fmtN(totalNet)}</td>
          </tr>
        </tfoot>
      </table>

      {/* FOOTER */}
      <table style={{width:"100%",fontSize:9,marginTop:4}}>
        <tbody>
          <tr>
            <td style={{width:"40%",verticalAlign:"bottom"}}>
              <div style={{color:"#555"}}>{periodStr}</div>
              <div style={{color:"#555"}}>INV. NO. {invNo}</div>
            </td>
            <td style={{width:"30%",textAlign:"center"}}>
              <div style={{marginTop:30,borderTop:"1px solid #333",paddingTop:4,fontSize:9,color:"#555"}}>Received by</div>
            </td>
            <td style={{width:"30%",textAlign:"center"}}>
              <div style={{fontWeight:700,fontSize:11,color:C.navy,marginBottom:2}}>{prepBy||"Shantii Imperial"}</div>
              <div style={{borderTop:"1px solid #333",paddingTop:4,fontSize:9,color:"#555"}}>Prepared by</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* TOTAL AMOUNT DUE BOX */}
      <div style={{marginTop:8,background:C.navy,color:"#fff",padding:"8px 16px",borderRadius:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontWeight:700,fontSize:12}}>TOTAL AMOUNT DUE</span>
        <span style={{fontWeight:900,fontSize:18}}>{fmt(totalNet)}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PRINTABLE PAYSLIP
// ═══════════════════════════════════════════════════════════════════════
function PrintPayslip({emp, p, att, loans, period, month, onClose}) {
  const monthStr = new Date(month+"-02").toLocaleString("en-PH",{month:"long",year:"numeric"});
  const [d1,d2] = period==="1st"?["1","15"]:["16","31"];
  const periodStr = `${monthStr.split(" ")[0].toUpperCase()} ${d1}-${d2}, ${monthStr.split(" ")[1]}`;

  const Row = ({label,value,red,amber,bold,indent})=>(
    <tr>
      <td style={{padding:"2px 6px",color:red?C.red:amber?C.amber:"#333",fontSize:9,paddingLeft:indent?20:6}}>{label}</td>
      <td style={{padding:"2px 6px",textAlign:"right",fontWeight:bold?700:400,color:red?C.red:amber?C.amber:"#222",fontSize:9}}>{fmtN(value)}</td>
    </tr>
  );

  return (
    <div className="printable" style={{background:"#fff",fontFamily:"'Calibri',Arial,sans-serif",position:"fixed",top:0,left:0,width:"100%",height:"100%",zIndex:9999,overflow:"auto",padding:"6mm 8mm",boxSizing:"border-box"}}>
      <div className="no-print" style={{display:"flex",gap:10,marginBottom:12}}>
        <Btn onClick={()=>window.print()} color={C.teal}>🖨️ Print</Btn>
        <Btn onClick={onClose} outline color={C.navy}>✕ Close</Btn>
      </div>

      {/* PAYSLIP CARD — designed to fit half A4 so 2 can be printed per page */}
      <div style={{maxWidth:360,margin:"0 auto",border:"2px solid "+C.navy,borderRadius:6,overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:C.navy,color:"#fff",padding:"10px 14px"}}>
          <div style={{fontWeight:900,fontSize:13,letterSpacing:0.5}}>HYGEIA SERVICE PHILIPPINES CORP.</div>
          <div style={{fontSize:8,opacity:0.8}}>52 Indonesia St., Better Living Subd., Parañaque City</div>
          <div style={{marginTop:6,background:"rgba(255,255,255,0.18)",borderRadius:4,padding:"3px 10px",display:"inline-block",fontWeight:700,fontSize:9}}>
            PAYSLIP — {periodStr}
          </div>
        </div>

        {/* Employee info */}
        <div style={{background:C.light,padding:"8px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 12px",fontSize:8.5}}>
          {[
            ["Name", `${emp.surname}, ${emp.name}`],
            ["Position", emp.isSupervisor?"Supervisor":"Janitor"],
            ["Hospital", emp.hospital.replace("PRIME HOSPITAL AND MEDICAL CENTER - PASIG INC.","Prime Hospital").replace("UNIHEALTH PARANAQUE HOSPITAL AND MEDICAL CENTER","Unihealth Parañaque")],
            ["Daily Rate", fmt(emp.dailyPayroll)],
            ["SSS No.", emp.sssNo],
            ["PhilHealth No.", emp.phNo],
            ["Pag-IBIG No.", emp.hdmfNo],
            ["Days Worked", FACTOR - (att.absences||0) > 0 ? (FACTOR - (att.absences||0)).toFixed(2) : "—"],
          ].map(([l,v])=>(
            <div key={l}><div style={{fontSize:7.5,color:"#888",fontWeight:700,textTransform:"uppercase"}}>{l}</div><div style={{fontWeight:600,color:"#1f2937",fontSize:8.5}}>{v}</div></div>
          ))}
        </div>

        {/* Earnings & Deductions */}
        <div style={{padding:"0 14px 10px"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <tbody>
              <tr><td colSpan={2} style={{padding:"6px 6px 2px",fontWeight:700,color:C.navy,fontSize:9,borderBottom:"1.5px solid "+C.navy}}>EARNINGS</td></tr>
              <Row label="Basic Pay" value={p.basicPay} />
              {p.lhAmt>0   && <Row indent label={`Legal Holiday (${att.lhHrs} hrs × ₱${p.hp}/hr)`} value={p.lhAmt} />}
              {p.shAmt>0   && <Row indent label={`Special Holiday (${att.shHrs} hrs × ₱${p.shRate}/hr)`} value={p.shAmt} />}
              {p.nsAmt>0   && <Row indent label={`Night Shift (${att.nsHrs} hrs × ₱${p.nsRate}/hr)`} value={p.nsAmt} />}
              {p.otAmt>0   && <Row indent label={`Overtime (${att.otHrs} hrs × ₱${p.otRate}/hr)`} value={p.otAmt} />}
              {p.extraAmt>0 && <Row indent label={`Extra/Day-off (${att.extraDays} day/s)`} value={p.extraAmt} />}
              {p.adjustment!==0 && <Row indent label="Adjustment" value={p.adjustment} />}
              <tr><td colSpan={2} style={{borderTop:"1px solid #dde3ed"}}></td></tr>
              <tr>
                <td style={{padding:"3px 6px",fontWeight:800,color:C.navy,fontSize:9}}>SUB-TOTAL</td>
                <td style={{padding:"3px 6px",textAlign:"right",fontWeight:800,color:C.navy,fontSize:9}}>{fmtN(p.subTotal)}</td>
              </tr>

              <tr><td colSpan={2} style={{padding:"6px 6px 2px",fontWeight:700,color:C.red,fontSize:9,borderBottom:"1.5px solid "+C.red}}>GOVERNMENT DEDUCTIONS</td></tr>
              <Row indent label="SSS Contribution (2025)" value={p.sss} red />
              <Row indent label="PhilHealth (2.5%)" value={p.philhealth} red />
              <Row indent label="Pag-IBIG / HDMF" value={p.hdmf} red />

              {loans.length>0&&<>
                <tr><td colSpan={2} style={{padding:"6px 6px 2px",fontWeight:700,color:C.amber,fontSize:9,borderBottom:"1.5px solid "+C.amber}}>LOAN DEDUCTIONS</td></tr>
                {loans.map(l=><Row key={l.id} indent label={l.type} value={r2(l.monthly/2)} amber />)}
              </>}

              {(p.medFee>0||p.vale>0||p.utAmt>0)&&<>
                <tr><td colSpan={2} style={{padding:"6px 6px 2px",fontWeight:700,color:"#7c3aed",fontSize:9,borderBottom:"1.5px solid #7c3aed"}}>OTHER DEDUCTIONS</td></tr>
                {p.medFee>0 && <tr><td style={{padding:"2px 6px 2px 18px",fontSize:9,color:"#7c3aed"}}>Medical Fee</td><td style={{padding:"2px 6px",textAlign:"right",fontSize:9,color:"#7c3aed"}}>{fmtN(p.medFee)}</td></tr>}
                {p.vale>0   && <tr><td style={{padding:"2px 6px 2px 18px",fontSize:9,color:"#7c3aed"}}>Vale (Cash Advance)</td><td style={{padding:"2px 6px",textAlign:"right",fontSize:9,color:"#7c3aed"}}>{fmtN(p.vale)}</td></tr>}
                {p.utAmt>0  && <tr><td style={{padding:"2px 6px 2px 18px",fontSize:9,color:"#7c3aed"}}>Undertime ({att.utMins} mins)</td><td style={{padding:"2px 6px",textAlign:"right",fontSize:9,color:"#7c3aed"}}>{fmtN(p.utAmt)}</td></tr>}
              </>}

              <tr><td colSpan={2} style={{borderTop:"1px solid #dde3ed"}}></td></tr>
              <tr>
                <td style={{padding:"3px 6px",fontWeight:700,color:C.red,fontSize:9}}>TOTAL DEDUCTIONS</td>
                <td style={{padding:"3px 6px",textAlign:"right",fontWeight:700,color:C.red,fontSize:9}}>{fmtN(p.totalDed)}</td>
              </tr>
            </tbody>
          </table>

          {/* Net Pay */}
          <div style={{background:C.navy,color:"#fff",borderRadius:5,padding:"7px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
            <span style={{fontWeight:800,fontSize:11}}>NET PAY</span>
            <span style={{fontWeight:900,fontSize:17}}>{fmt(p.netPay)}</span>
          </div>

          {/* Signatures */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginTop:16}}>
            <div style={{borderTop:"1px solid #aaa",paddingTop:4,textAlign:"center",fontSize:8,color:"#888"}}>Employee Signature / Date</div>
            <div style={{borderTop:"1px solid #aaa",paddingTop:4,textAlign:"center",fontSize:8,color:"#888"}}>HR / Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab]         = useState("Employees");
  const [employees, setEmp]   = useState(INIT_EMP);
  const [loans, setLoans]     = useState(INIT_LOANS);
  const [attendance, setAtt]  = useState({});
  const [month, setMonth]     = useState("2026-04");
  const [period, setPeriod]   = useState("1st");
  const [selEmp, setSelEmp]   = useState(null);
  const [billingHosp, setBH]  = useState(HOSPITALS[1].name);
  const [payrollHospFilter, setPayrollHospFilter] = useState(HOSPITALS[0].name);
  const [invNo, setInvNo]     = useState("00000069");
  const [prepBy, setPrepBy]   = useState("Shantii Imperial");
  const [printBill, setPrintBill] = useState(false);
  const [printPayslip, setPrintPayslip] = useState(null); // emp id
  const [printAllPayslips, setPrintAllPayslips] = useState(false);

  // P&L state
  const [pnlExpenses, setPnlExpenses] = useState([
    { id:1, label:"Office Rent",          amount:15000, category:"overhead" },
    { id:2, label:"Utilities (Elec/Water)",amount:5000,  category:"overhead" },
    { id:3, label:"Internet & Phone",      amount:2500,  category:"overhead" },
    { id:4, label:"Transportation",        amount:3000,  category:"overhead" },
    { id:5, label:"Supplies & Materials",  amount:2000,  category:"overhead" },
    { id:6, label:"SSS Employer Share",    amount:0,     category:"labor" },
    { id:7, label:"PhilHealth Employer",   amount:0,     category:"labor" },
    { id:8, label:"EC Insurance",          amount:0,     category:"labor" },
    { id:9, label:"Pag-IBIG Employer",     amount:0,     category:"labor" },
  ]);
  const [newExp, setNewExp] = useState({ label:"", amount:"", category:"overhead" });
  // Payables - quarterly VAT tracking (stores months that have been "filed")
  const [vatFiled, setVatFiled] = useState({});
  // Supplies input per cut-off (separate from P&L)
  const [suppliesAmt, setSuppliesAmt] = useState(0);

  // Employee form
  const [showEF, setShowEF] = useState(false);
  const [editId, setEditId] = useState(null);
  const [ef, setEF] = useState({surname:"",name:"",dailyPayroll:695,isSupervisor:false,hospital:HOSPITALS[0].name,sssNo:"",phNo:"",hdmfNo:""});

  // Loan form
  const [showLF, setShowLF] = useState(false);
  const [lf, setLF] = useState({empId:"",type:LOAN_TYPES[0],monthly:"",balance:"",startMonth:month});

  const getAtt = (id) => attendance[id] || {absences:0,lhHrs:0,shHrs:0,nsHrs:0,otHrs:0,straightHrs:0,extraDays:0,adjustment:0,medFee:0,vale:0,utMins:0,insurance:0};
  const setAF  = (id,f,v) => setAtt(p=>({...p,[id]:{...getAtt(id),[f]:parseFloat(v)||0}}));

  const monthStr   = new Date(month+"-02").toLocaleString("en-PH",{month:"long",year:"numeric"});
  const [d1,d2]    = period==="1st"?["1","15"]:["16","31"];
  const periodStr  = `${monthStr.split(" ")[0]} ${d1}–${d2}, ${monthStr.split(" ")[1]}`;

  const allPayroll = useMemo(()=>employees.map(e=>({
    emp:e, att:getAtt(e.id), ...computePayroll(e, getAtt(e.id), loans.filter(l=>l.empId===e.id))
  })),[employees,attendance,loans]);

  const hospEmps   = useMemo(()=>employees.filter(e=>e.hospital===billingHosp),[employees,billingHosp]);
  const billingRows= useMemo(()=>hospEmps.map(e=>({
    emp:e, att:getAtt(e.id), ...computeBilling(e, getAtt(e.id))
  })),[hospEmps,attendance]);

  // CRUD
  const saveEmp = ()=>{
    if(!ef.surname||!ef.dailyPayroll) return;
    const dp = parseFloat(ef.dailyPayroll)||695;
    const isSup = ef.isSupervisor==="true"||ef.isSupervisor===true;
    const data = {...ef, dailyPayroll:dp, monthlyBilling:calcBillingMonthly(dp,isSup), dailyBilling:calcBillingDaily(dp,isSup), isSupervisor:isSup};
    if(editId) setEmp(p=>p.map(e=>e.id===editId?{...e,...data}:e));
    else setEmp(p=>[...p,{...data,id:Date.now()}]);
    setShowEF(false); setEditId(null);
  };
  const startEdit=(e)=>{ setEF({surname:e.surname,name:e.name,dailyPayroll:e.dailyPayroll,isSupervisor:e.isSupervisor,hospital:e.hospital,sssNo:e.sssNo,phNo:e.phNo,hdmfNo:e.hdmfNo}); setEditId(e.id); setShowEF(true); };
  const delEmp=(id)=>{ setEmp(p=>p.filter(e=>e.id!==id)); setLoans(p=>p.filter(l=>l.empId!==id)); };
  const saveLoan=()=>{ if(!lf.empId||!lf.monthly) return; setLoans(p=>[...p,{...lf,id:Date.now(),empId:parseInt(lf.empId),monthly:parseFloat(lf.monthly)||0,balance:parseFloat(lf.balance)||0}]); setShowLF(false); };

  // Print payslip data
  const psPrint = printPayslip ? allPayroll.find(p=>p.emp.id===printPayslip) : null;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.light,fontFamily:"'Segoe UI',Tahoma,sans-serif"}}>
      <style>{PRINT_STYLE}</style>

      {/* Print overlays */}
      {printBill && (
        <PrintBilling hospName={billingHosp} period={period} month={month} invNo={invNo} prepBy={prepBy}
          rows={billingRows} onClose={()=>setPrintBill(false)} />
      )}
      {psPrint && (
        <PrintPayslip emp={psPrint.emp} p={psPrint} att={psPrint.att}
          loans={loans.filter(l=>l.empId===psPrint.emp.id)} period={period} month={month}
          onClose={()=>setPrintPayslip(null)} />
      )}
      {printAllPayslips && (
        <div className="printable" style={{background:"#fff",position:"fixed",top:0,left:0,width:"100%",zIndex:9999,padding:"6mm",boxSizing:"border-box"}}>
          <div className="no-print" style={{display:"flex",gap:10,marginBottom:12}}>
            <Btn onClick={()=>window.print()} color={C.teal}>🖨️ Print All</Btn>
            <Btn onClick={()=>setPrintAllPayslips(false)} outline color={C.navy}>✕ Close</Btn>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8mm"}}>
            {allPayroll.map(pr=>(
              <MiniPayslip key={pr.emp.id} emp={pr.emp} p={pr} att={pr.att} loans={loans.filter(l=>l.empId===pr.emp.id)} period={period} month={month} />
            ))}
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.teal} 100%)`,color:"#fff",padding:"16px 24px 0",boxShadow:"0 3px 16px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{fontSize:28}}>🏥</div>
          <div>
            <div style={{fontWeight:900,fontSize:17,letterSpacing:0.3}}>HYGEIA SERVICE PHILIPPINES CORP.</div>
            <div style={{fontSize:11,opacity:0.75}}>52 Indonesia St., Better Living Subd., Brgy. Don Bosco, Parañaque City 1700 • NCR Wage Order No. 26 • ₱695/day</div>
          </div>
        </div>
        <div style={{display:"flex",gap:2}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 18px",border:"none",borderRadius:"7px 7px 0 0",fontWeight:700,fontSize:13,cursor:"pointer",background:tab===t?"#fff":"rgba(255,255,255,0.13)",color:tab===t?C.navy:"#fff"}}>
              {{"Employees":"👥","Loans":"💳","Payroll":"💼","Payslip":"📄","Billing":"🧾","P&L":"📊","Payables":"🏛️"}[t]} {t}
            </button>
          ))}
        </div>
      </div>

      {/* Period bar */}
      <div style={{background:"#fff",borderBottom:"1px solid "+C.border,padding:"10px 24px",display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <label style={{fontSize:12,fontWeight:700,color:"#6b7280"}}>MONTH:</label>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{padding:"5px 10px",borderRadius:6,border:"1.5px solid "+C.border,fontSize:13}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <label style={{fontSize:12,fontWeight:700,color:"#6b7280"}}>CUT-OFF:</label>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"5px 10px",borderRadius:6,border:"1.5px solid "+C.border,fontSize:13}}>
            <option value="1st">1st (1–15)</option>
            <option value="2nd">2nd (16–end)</option>
          </select>
        </div>
        <div style={{marginLeft:"auto",fontSize:13,color:"#6b7280",fontWeight:600}}>Period: <span style={{color:C.navy}}>{periodStr}</span></div>
      </div>

      <div style={{padding:"22px 24px",maxWidth:1300,margin:"0 auto"}}>

        {/* ══ EMPLOYEES ══ */}
        {tab==="Employees" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,color:C.navy,fontWeight:900}}>Employee Records</h2>
              <Btn onClick={()=>{setShowEF(true);setEditId(null);setEF({surname:"",name:"",dailyPayroll:695,isSupervisor:false,hospital:HOSPITALS[0].name,sssNo:"",phNo:"",hdmfNo:""});}}>+ Add Employee</Btn>
            </div>

            {showEF&&(
              <div style={{background:"#fff",borderRadius:10,padding:20,marginBottom:18,border:"2px solid "+C.teal,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
                <h3 style={{margin:"0 0 14px",color:C.navy}}>{editId?"✏️ Edit":"➕ New"} Employee</h3>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                  <Inp label="Surname" value={ef.surname} onChange={e=>setEF(p=>({...p,surname:e.target.value.toUpperCase()}))} />
                  <Inp label="First Name" value={ef.name} onChange={e=>setEF(p=>({...p,name:e.target.value.toUpperCase()}))} />
                  <Sel label="Position" value={ef.isSupervisor} onChange={e=>setEF(p=>({...p,isSupervisor:e.target.value==="true"}))}>
                    <option value={false}>Janitor</option>
                    <option value={true}>Supervisor</option>
                  </Sel>
                  <Sel label="Hospital" value={ef.hospital} onChange={e=>setEF(p=>({...p,hospital:e.target.value}))}>
                    {HOSPITALS.map(h=><option key={h.name} value={h.name}>{h.short}</option>)}
                  </Sel>
                  <Inp label="Daily Payroll Rate (₱)" type="number" min={695} value={ef.dailyPayroll} onChange={e=>setEF(p=>({...p,dailyPayroll:e.target.value}))} />
                  <div style={{background:"#f0fdf4",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#166534",display:"flex",flexDirection:"column",justifyContent:"center"}}>
                    <div>📋 Billing daily: <b>{fmt(calcBillingDaily(parseFloat(ef.dailyPayroll)||695, ef.isSupervisor==="true"||ef.isSupervisor===true))}</b></div>
                    <div style={{fontSize:11,opacity:0.8}}>Auto-computed from contract formula</div>
                  </div>
                  <Inp label="SSS Number" value={ef.sssNo} onChange={e=>setEF(p=>({...p,sssNo:e.target.value}))} />
                  <Inp label="PhilHealth No." value={ef.phNo} onChange={e=>setEF(p=>({...p,phNo:e.target.value}))} />
                  <Inp label="Pag-IBIG No." value={ef.hdmfNo} onChange={e=>setEF(p=>({...p,hdmfNo:e.target.value}))} />
                </div>
                <div style={{display:"flex",gap:8,marginTop:14}}>
                  <Btn onClick={saveEmp}>Save</Btn>
                  <Btn onClick={()=>{setShowEF(false);setEditId(null);}} outline color={C.navy}>Cancel</Btn>
                </div>
              </div>
            )}

            <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:C.navy,color:"#fff"}}>
                    {["#","Surname","Name","Position","Daily Payroll","SM Basic","Daily Billing","SM Billing","Hospital","Loans",""].map(h=>(
                      <th key={h} style={{padding:"10px 10px",textAlign:"left",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e,i)=>(
                    <tr key={e.id} style={{background:i%2===0?"#f9fafb":"#fff",borderBottom:"1px solid #f0f0f0"}}>
                      <td style={{padding:"9px 10px",fontSize:12,color:"#9ca3af"}}>{i+1}</td>
                      <td style={{padding:"9px 10px",fontWeight:700,fontSize:13}}>{e.surname}</td>
                      <td style={{padding:"9px 10px",fontSize:13}}>{e.name}</td>
                      <td style={{padding:"9px 10px"}}>
                        <span style={{background:e.isSupervisor?"#fef3c7":"#eff6ff",color:e.isSupervisor?"#92400e":"#1d4ed8",borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:700}}>
                          {e.isSupervisor?"Supervisor":"Janitor"}
                        </span>
                      </td>
                      <td style={{padding:"9px 10px",color:C.teal,fontWeight:700,fontSize:13}}>{fmt(e.dailyPayroll)}</td>
                      <td style={{padding:"9px 10px",fontSize:12}}>{fmt(r2(e.dailyPayroll*FACTOR))}</td>
                      <td style={{padding:"9px 10px",color:C.navy,fontWeight:700,fontSize:13}}>{fmt(e.dailyBilling)}</td>
                      <td style={{padding:"9px 10px",fontSize:12}}>{fmt(r2(e.dailyBilling*FACTOR))}</td>
                      <td style={{padding:"9px 10px",fontSize:11,color:"#6b7280",maxWidth:180}}>{e.hospital.includes("PRIME")?"Prime Hospital":"Unihealth Parañaque"}</td>
                      <td style={{padding:"9px 10px"}}>
                        {loans.filter(l=>l.empId===e.id).length>0
                          ?<span style={{background:"#fef3c7",color:"#92400e",borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:700}}>{loans.filter(l=>l.empId===e.id).length} loan(s)</span>
                          :<span style={{color:"#d1d5db",fontSize:11}}>—</span>}
                      </td>
                      <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>
                        <Btn onClick={()=>startEdit(e)} color="#3b82f6" sm>Edit</Btn>{" "}
                        <Btn onClick={()=>delEmp(e.id)} color={C.red} sm>Del</Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Info cards */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:20}}>
              {HOSPITALS.map(h=>(
                <div key={h.name} style={{background:"#fff",borderRadius:10,padding:16,boxShadow:"0 2px 6px rgba(0,0,0,0.06)",borderLeft:"4px solid "+C.teal}}>
                  <div style={{fontWeight:800,color:C.navy,fontSize:14}}>{h.name}</div>
                  <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{h.address}</div>
                  <div style={{fontSize:12,marginTop:6}}>Deployed: <b>{employees.filter(e=>e.hospital===h.name).length}</b> &nbsp;|&nbsp; Janitors: <b>{employees.filter(e=>e.hospital===h.name&&!e.isSupervisor).length}</b> &nbsp;|&nbsp; Supervisors: <b>{employees.filter(e=>e.hospital===h.name&&e.isSupervisor).length}</b></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ LOANS ══ */}
        {tab==="Loans"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,color:C.navy,fontWeight:900}}>Loan & Deduction Records</h2>
              <Btn onClick={()=>setShowLF(true)}>+ Add Loan</Btn>
            </div>
            {showLF&&(
              <div style={{background:"#fff",borderRadius:10,padding:20,marginBottom:18,border:"2px solid "+C.teal}}>
                <h3 style={{margin:"0 0 12px",color:C.navy}}>New Loan Entry</h3>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                  <Sel label="Employee" value={lf.empId} onChange={e=>setLF(p=>({...p,empId:e.target.value}))}>
                    <option value="">— Select —</option>
                    {employees.map(e=><option key={e.id} value={e.id}>{e.surname}, {e.name}</option>)}
                  </Sel>
                  <Sel label="Loan Type" value={lf.type} onChange={e=>setLF(p=>({...p,type:e.target.value}))}>
                    {LOAN_TYPES.map(t=><option key={t}>{t}</option>)}
                  </Sel>
                  <Inp label="Monthly Deduction (₱)" type="number" min="0" value={lf.monthly} onChange={e=>setLF(p=>({...p,monthly:e.target.value}))} />
                  <Inp label="Outstanding Balance (₱)" type="number" min="0" value={lf.balance} onChange={e=>setLF(p=>({...p,balance:e.target.value}))} />
                  <Inp label="Start Month" type="month" value={lf.startMonth} onChange={e=>setLF(p=>({...p,startMonth:e.target.value}))} />
                  <div style={{background:"#fef9c3",borderRadius:7,padding:"8px 12px",fontSize:12,color:"#713f12",display:"flex",alignItems:"center"}}>
                    ⚡ Per cut-off = <b style={{marginLeft:4}}>{fmt((parseFloat(lf.monthly)||0)/2)}</b>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:14}}><Btn onClick={saveLoan}>Save</Btn><Btn onClick={()=>setShowLF(false)} outline color={C.navy}>Cancel</Btn></div>
              </div>
            )}
            {loans.length===0
              ?<div style={{background:"#fff",borderRadius:10,padding:40,textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:36,marginBottom:8}}>💳</div><b>No loans recorded</b></div>
              :<div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr style={{background:C.navy,color:"#fff"}}>{["Employee","Type","Monthly","Per Cut-off","Balance","Start",""].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:12,fontWeight:700}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {loans.map((l,i)=>{
                      const e=employees.find(x=>x.id===l.empId);
                      return(
                        <tr key={l.id} style={{background:i%2===0?"#f9fafb":"#fff",borderBottom:"1px solid #f0f0f0"}}>
                          <td style={{padding:"9px 12px",fontWeight:700,fontSize:13}}>{e?`${e.surname}, ${e.name}`:"—"}</td>
                          <td style={{padding:"9px 12px"}}><span style={{background:l.type.includes("SSS")?"#eff6ff":"#f0fdf4",color:l.type.includes("SSS")?"#1d4ed8":"#166534",borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:700}}>{l.type}</span></td>
                          <td style={{padding:"9px 12px",fontWeight:700}}>{fmt(l.monthly)}</td>
                          <td style={{padding:"9px 12px",color:C.amber}}>{fmt(l.monthly/2)}</td>
                          <td style={{padding:"9px 12px",color:C.red,fontWeight:700}}>{fmt(l.balance)}</td>
                          <td style={{padding:"9px 12px",fontSize:12,color:"#6b7280"}}>{l.startMonth}</td>
                          <td style={{padding:"9px 12px"}}><Btn onClick={()=>setLoans(p=>p.filter(x=>x.id!==l.id))} color={C.red} sm>Remove</Btn></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            }
          </div>
        )}

        {/* ══ PAYROLL ══ */}
        {tab==="Payroll"&&(()=>{
          const filteredEmps = employees.filter(e=>e.hospital===payrollHospFilter);
          const filteredPayroll = allPayroll.filter(p=>p.emp.hospital===payrollHospFilter);
          const hospShort = payrollHospFilter.includes("PRIME")?"Prime Hospital":"Unihealth Parañaque";
          return (
          <div>
            {/* Hospital Toggle */}
            <div style={{display:"flex",gap:0,marginBottom:20,borderRadius:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",border:"1.5px solid "+C.border}}>
              {HOSPITALS.map((h,hi)=>(
                <button key={h.name} onClick={()=>setPayrollHospFilter(h.name)}
                  style={{flex:1,padding:"14px 20px",border:"none",cursor:"pointer",fontWeight:700,fontSize:14,
                    background:payrollHospFilter===h.name?C.navy:"#fff",
                    color:payrollHospFilter===h.name?"#fff":"#374151",
                    borderRight:hi===0?"1.5px solid "+C.border:"none",transition:"all 0.15s"}}>
                  🏥 {h.short}
                  <div style={{fontSize:11,fontWeight:400,marginTop:2,opacity:payrollHospFilter===h.name?0.8:0.5}}>
                    {employees.filter(e=>e.hospital===h.name).length} employees
                  </div>
                </button>
              ))}
            </div>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,color:C.navy,fontWeight:900}}>Payroll — {hospShort} — {periodStr}</h2>
              <Btn onClick={()=>setPrintAllPayslips(true)} color={C.teal} sm>🖨️ Print Payslips</Btn>
            </div>

            {/* Attendance */}
            <div style={{background:"#fff",borderRadius:10,padding:18,marginBottom:18,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <div style={{fontWeight:700,color:C.navy,marginBottom:12,fontSize:14}}>📋 Attendance & Additional Pay — {hospShort}</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:C.light}}>
                    {["Employee","Absences","LH Hrs","SH Hrs","NS Hrs","OT Hrs","Straight Hrs","Extra Days","Adjustment","Med Fee","Vale","UT (mins)","Insurance"].map(h=>(
                      <th key={h} style={{padding:"8px 8px",textAlign:h==="Employee"?"left":"center",fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredEmps.map(e=>{
                      const a=getAtt(e.id);
                      return(
                        <tr key={e.id} style={{borderBottom:"1px solid #f0f0f0"}}>
                          <td style={{padding:"6px 8px",fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>
                            {e.surname}, {e.name}
                            {e.isSupervisor&&<span style={{marginLeft:5,background:"#fef3c7",color:"#92400e",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700}}>SUP</span>}
                          </td>
                          {["absences","lhHrs","shHrs","nsHrs","otHrs","straightHrs","extraDays","adjustment","medFee","vale","utMins","insurance"].map(f=>(
                            <td key={f} style={{padding:"4px 6px",textAlign:"center"}}>
                              <input type="number" min="0" value={a[f]||0} onChange={ev=>setAF(e.id,f,ev.target.value)}
                                style={{width:52,padding:"4px 5px",borderRadius:5,border:"1.5px solid "+C.border,textAlign:"center",fontSize:12}}/>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <div style={{background:C.navy,color:"#fff",padding:"12px 18px",fontWeight:700,fontSize:14}}>
                Payroll Summary — {hospShort} — {periodStr}
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:C.light}}>
                    {[["#","","l"],["Surname","","l"],["Name","","l"],["Basic","","r"],["LH","","r"],["SH","","r"],["NS","","r"],["OT","","r"],["Straight","","r"],["Extra","","r"],["Adj","","r"],["SUB-TOTAL",C.navy,"r"],["SSS",C.red,"r"],["PhilHealth",C.red,"r"],["Pag-IBIG",C.red,"r"],["SSS Loan",C.amber,"r"],["HDMF Loan",C.amber,"r"],["Med/Vale/UT",C.red,"r"],["NET PAY",C.teal,"r"],[""]].map(([h,col,a],i)=>(
                      <th key={i} style={{padding:"9px 8px",textAlign:a==="r"?"right":"left",fontSize:10,fontWeight:700,whiteSpace:"nowrap",color:col||"#374151"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredPayroll.map(({emp,basicPay,lhAmt,shAmt,nsAmt,otAmt,extraAmt,adjustment,subTotal,sss,philhealth,hdmf,sssLoans,hdmfLoans,medFee,vale,utAmt,netPay},i)=>(
                      <tr key={emp.id} style={{background:i%2===0?"#f9fafb":"#fff",borderBottom:"1px solid #f0f0f0"}}>
                        <td style={{padding:"8px 8px",fontSize:11,color:"#9ca3af"}}>{i+1}</td>
                        <td style={{padding:"8px 8px",fontWeight:700,fontSize:12}}>{emp.surname}</td>
                        <td style={{padding:"8px 8px",fontSize:12}}>{emp.name}{emp.isSupervisor&&<span style={{marginLeft:4,background:"#fef3c7",color:"#92400e",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700}}>SUP</span>}</td>
                        {[basicPay,lhAmt,shAmt,nsAmt,otAmt,straightAmt,extraAmt,adjustment].map((v,vi)=><td key={vi} style={{padding:"8px 8px",textAlign:"right"}}>{fmt(v)}</td>)}
                        <td style={{padding:"8px 8px",textAlign:"right",fontWeight:700,color:C.navy}}>{fmt(subTotal)}</td>
                        {[sss,philhealth,hdmf].map((v,vi)=><td key={vi} style={{padding:"8px 8px",textAlign:"right",color:C.red}}>{fmt(v)}</td>)}
                        {[sssLoans,hdmfLoans].map((v,vi)=><td key={vi} style={{padding:"8px 8px",textAlign:"right",color:C.amber}}>{v>0?fmt(v):"—"}</td>)}
                        <td style={{padding:"8px 8px",textAlign:"right",color:C.red}}>{(medFee+vale+utAmt)>0?fmt(medFee+vale+utAmt):"—"}</td>
                        <td style={{padding:"8px 8px",textAlign:"right",fontWeight:800,color:C.teal,fontSize:12}}>{fmt(netPay)}</td>
                        <td style={{padding:"8px 8px"}}><Btn onClick={()=>{setSelEmp(emp.id);setTab("Payslip");}} color={C.navy} sm>Slip</Btn></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:C.navy,color:"#fff",fontWeight:700}}>
                      <td colSpan={3} style={{padding:"10px 8px",fontSize:12}}>TOTAL — {filteredPayroll.length} employees</td>
                      {["basicPay","lhAmt","shAmt","nsAmt","otAmt","straightAmt","extraAmt","adjustment","subTotal","sss","philhealth","hdmf","sssLoans","hdmfLoans"].map(k=>(
                        <td key={k} style={{padding:"10px 8px",textAlign:"right",fontSize:11}}>{fmt(sumK(filteredPayroll,k))}</td>
                      ))}
                      <td style={{padding:"10px 8px",textAlign:"right",fontSize:11}}>{fmt(sumK(filteredPayroll,"medFee")+sumK(filteredPayroll,"vale")+sumK(filteredPayroll,"utAmt"))}</td>
                      <td style={{padding:"10px 8px",textAlign:"right",fontSize:12}}>{fmt(sumK(filteredPayroll,"netPay"))}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

        {/* ══ PAYSLIP ══ */}
        {tab==="Payslip"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <h2 style={{margin:0,color:C.navy,fontWeight:900}}>Employee Payslip</h2>
              <Btn onClick={()=>setPrintAllPayslips(true)} color={C.teal}>🖨️ Print All Payslips</Btn>
            </div>
            <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
              <Sel value={selEmp||""} onChange={e=>setSelEmp(Number(e.target.value))}>
                <option value="">— Select Employee —</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.surname}, {e.name}</option>)}
              </Sel>
            </div>

            {selEmp&&(()=>{
              const pr = allPayroll.find(x=>x.emp.id===selEmp);
              if(!pr) return null;
              const empLoans = loans.filter(l=>l.empId===selEmp);
              return (
                <div style={{maxWidth:480,margin:"0 auto"}}>
                  {/* Screen payslip */}
                  <div style={{background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.10)"}}>
                    <div style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`,color:"#fff",padding:"22px 28px"}}>
                      <div style={{fontWeight:900,fontSize:16}}>HYGEIA SERVICE PHILIPPINES CORP.</div>
                      <div style={{fontSize:11,opacity:0.75,marginBottom:12}}>52 Indonesia St., Better Living Subd., Parañaque City</div>
                      <div style={{background:"rgba(255,255,255,0.18)",borderRadius:7,padding:"5px 14px",display:"inline-block",fontWeight:700,fontSize:12}}>
                        PAYSLIP — {periodStr.toUpperCase()}
                      </div>
                    </div>
                    <div style={{padding:"18px 24px"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,background:C.light,borderRadius:9,padding:14,marginBottom:16}}>
                        {[["Name",`${pr.emp.surname}, ${pr.emp.name}`],["Position",pr.emp.isSupervisor?"Supervisor":"Janitor"],["Hospital",pr.emp.hospital.includes("PRIME")?"Prime Hospital":"Unihealth Parañaque"],["Daily Rate",fmt(pr.emp.dailyPayroll)],["SSS No.",pr.emp.sssNo],["PhilHealth No.",pr.emp.phNo],["Pag-IBIG No.",pr.emp.hdmfNo],["Absences",pr.att.absences||0]].map(([l,v])=>(
                          <div key={l}><div style={{fontSize:10,color:"#9ca3af",fontWeight:700,textTransform:"uppercase"}}>{l}</div><div style={{fontWeight:700,color:"#1f2937",fontSize:13}}>{v}</div></div>
                        ))}
                      </div>

                      {/* Earnings */}
                      <div style={{fontWeight:800,color:C.navy,borderBottom:"2px solid "+C.navy,paddingBottom:5,marginBottom:8,fontSize:13}}>EARNINGS</div>
                      {[["Basic Pay",pr.basicPay],pr.lhAmt>0&&[`Legal Holiday (${pr.att.lhHrs} hrs × ₱${pr.hp})`,pr.lhAmt],pr.shAmt>0&&[`Special Holiday (${pr.att.shHrs} hrs × ₱${pr.shRate})`,pr.shAmt],pr.nsAmt>0&&[`Night Shift (${pr.att.nsHrs} hrs × ₱${pr.nsRate})`,pr.nsAmt],pr.otAmt>0&&[`Overtime (${pr.att.otHrs} hrs × ₱${pr.otRate})`,pr.otAmt],pr.straightAmt>0&&[`Straight Duty (${pr.att.straightHrs} hrs × ₱${pr.hp})`,pr.straightAmt],pr.extraAmt>0&&[`Extra/Day-off (${pr.att.extraDays} day/s)`,pr.extraAmt],pr.adjustment&&["Adjustment",pr.adjustment]].filter(Boolean).map(([l,v])=>(
                        <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f6",fontSize:13}}>
                          <span style={{color:"#4b5563"}}>{l}</span><span style={{fontWeight:600}}>{fmt(v)}</span>
                        </div>
                      ))}
                      <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:"1.5px solid "+C.border,fontWeight:800,color:C.navy,marginBottom:12}}>
                        <span>SUB-TOTAL</span><span>{fmt(pr.subTotal)}</span>
                      </div>

                      {/* Gov deductions */}
                      <div style={{fontWeight:800,color:C.red,borderBottom:"2px solid "+C.red,paddingBottom:5,marginBottom:8,fontSize:13}}>GOVERNMENT DEDUCTIONS</div>
                      {[["SSS Contribution (2025)",pr.sss],["PhilHealth (2.5%)",pr.philhealth],["Pag-IBIG / HDMF",pr.hdmf]].map(([l,v])=>(
                        <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f6",fontSize:13}}>
                          <span style={{color:"#4b5563"}}>{l}</span><span style={{fontWeight:600,color:C.red}}>{fmt(v)}</span>
                        </div>
                      ))}

                      {empLoans.length>0&&<>
                        <div style={{fontWeight:800,color:C.amber,borderBottom:"2px solid "+C.amber,paddingBottom:5,marginBottom:8,marginTop:10,fontSize:13}}>LOAN DEDUCTIONS</div>
                        {empLoans.map(l=>(
                          <div key={l.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f6",fontSize:13}}>
                            <span style={{color:"#4b5563"}}>{l.type}</span><span style={{fontWeight:600,color:C.amber}}>{fmt(l.monthly/2)}</span>
                          </div>
                        ))}
                      </>}

                      {(pr.medFee>0||pr.vale>0||pr.utAmt>0)&&<>
                        <div style={{fontWeight:800,color:"#7c3aed",borderBottom:"2px solid #7c3aed",paddingBottom:5,marginBottom:8,marginTop:10,fontSize:13}}>OTHER DEDUCTIONS</div>
                        {pr.medFee>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f6",fontSize:13}}><span style={{color:"#4b5563"}}>Medical Fee</span><span style={{fontWeight:600,color:"#7c3aed"}}>{fmt(pr.medFee)}</span></div>}
                        {pr.vale>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f6",fontSize:13}}><span style={{color:"#4b5563"}}>Vale</span><span style={{fontWeight:600,color:"#7c3aed"}}>{fmt(pr.vale)}</span></div>}
                        {pr.utAmt>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f6",fontSize:13}}><span style={{color:"#4b5563"}}>Undertime ({pr.att.utMins} mins)</span><span style={{fontWeight:600,color:"#7c3aed"}}>{fmt(pr.utAmt)}</span></div>}
                      </>}

                      <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:"1.5px solid "+C.border,fontWeight:700,color:C.red,marginBottom:14}}>
                        <span>TOTAL DEDUCTIONS</span><span>{fmt(pr.totalDed)}</span>
                      </div>

                      <div style={{background:`linear-gradient(135deg,${C.teal},${C.navy})`,borderRadius:9,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",color:"#fff",marginBottom:16}}>
                        <span style={{fontWeight:800,fontSize:15}}>NET PAY</span>
                        <span style={{fontWeight:900,fontSize:24}}>{fmt(pr.netPay)}</span>
                      </div>

                      <Btn onClick={()=>setPrintPayslip(selEmp)} color={C.teal}>🖨️ Print This Payslip</Btn>

                      <div style={{marginTop:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:36}}>
                        <div style={{borderTop:"1.5px solid #d1d5db",paddingTop:8,textAlign:"center",fontSize:11,color:"#9ca3af"}}>Employee Signature / Date</div>
                        <div style={{borderTop:"1.5px solid #d1d5db",paddingTop:8,textAlign:"center",fontSize:11,color:"#9ca3af"}}>HR / Authorized Signatory</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══ BILLING ══ */}
        {tab==="Billing"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <h2 style={{margin:0,color:C.navy,fontWeight:900}}>Statement of Account / Billing</h2>
              {billingRows.length>0&&<Btn onClick={()=>setPrintBill(true)} color={C.teal}>🖨️ Print Billing</Btn>}
            </div>

            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end",marginBottom:18}}>
              <Sel label="Hospital Client" value={billingHosp} onChange={e=>setBH(e.target.value)}>
                {HOSPITALS.map(h=><option key={h.name} value={h.name}>{h.name}</option>)}
              </Sel>
              <Inp label="Invoice No." value={invNo} onChange={e=>setInvNo(e.target.value)} />
              <Inp label="Prepared By" value={prepBy} onChange={e=>setPrepBy(e.target.value)} />
            </div>

            {billingRows.length===0
              ?<div style={{background:"#fff",borderRadius:10,padding:40,textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:36,marginBottom:8}}>🏥</div><b>No employees assigned to this hospital</b></div>
              :(
                <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                  <div style={{background:C.navy,color:"#fff",padding:"13px 18px",fontWeight:700,fontSize:14}}>
                    {billingHosp} — {periodStr}
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead><tr style={{background:C.light}}>
                        {["#","Surname","Name","Basic Rate\n(S/M)","Daily Rate","Hourly Rate","Absences","Basic","LH Rate","LH Hrs","Legal Hol.","SH Rate","SH Hrs","Spec. Hol.","NS Rate","NS Hrs","Night Shift","Str. Hrs","Straight","Extra Days","Extra Pay","SUB-TOTAL","Insurance","UT Rate","UT Mins","UT","NET"].map((h,i)=>(
                          <th key={i} style={{padding:"8px 7px",textAlign:["#","Surname","Name"].includes(h)?"left":"right",fontSize:10,fontWeight:700,whiteSpace:"pre-line",lineHeight:1.2}}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {billingRows.map((r,i)=>{
                          const a=r.att;
                          return(
                            <tr key={r.emp.id} style={{background:i%2===0?"#f9fafb":"#fff",borderBottom:"1px solid #f0f0f0"}}>
                              <td style={{padding:"8px 7px",color:"#9ca3af"}}>{i+1}</td>
                              <td style={{padding:"8px 7px",fontWeight:700}}>{r.emp.surname}</td>
                              <td style={{padding:"8px 7px"}}>{r.emp.name}</td>
                              <td style={{padding:"8px 7px",textAlign:"right"}}>{fmt(r.smb)}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",fontWeight:700,color:C.navy}}>{fmt(r.db)}</td>
                              <td style={{padding:"8px 7px",textAlign:"right"}}>{fmt(r.hb)}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",color:a.absences>0?C.red:""}}>{a.absences||"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right"}}>{fmt(r.basicBill)}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",fontSize:10}}>{fmt(r.hb)}</td>
                              <td style={{padding:"8px 7px",textAlign:"right"}}>{a.lhHrs||"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",color:r.lhBill>0?C.navy:""}}>{r.lhBill>0?fmt(r.lhBill):"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",fontSize:10}}>{fmt(r.shRateB)}</td>
                              <td style={{padding:"8px 7px",textAlign:"right"}}>{a.shHrs||"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",color:r.shBill>0?C.navy:""}}>{r.shBill>0?fmt(r.shBill):"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",fontSize:10}}>{fmt(r.nsRateB)}</td>
                              <td style={{padding:"8px 7px",textAlign:"right"}}>{a.nsHrs||"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",color:r.nsBill>0?C.navy:""}}>{r.nsBill>0?fmt(r.nsBill):"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right"}}>{a.straightHrs||"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",color:r.straightBill>0?C.navy:""}}>{r.straightBill>0?fmt(r.straightBill):"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right"}}>{a.extraDays||"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",color:r.extraBill>0?C.teal:""}}>{r.extraBill>0?fmt(r.extraBill):"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",fontWeight:700,color:C.navy}}>{fmt(r.subTotal)}</td>
                              <td style={{padding:"8px 7px",textAlign:"right"}}>{r.insurance>0?fmt(r.insurance):"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",fontSize:10}}>{fmt(r.utRateB)}</td>
                              <td style={{padding:"8px 7px",textAlign:"right"}}>{a.utMins||"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",color:r.utBill>0?C.red:""}}>{r.utBill>0?fmt(r.utBill):"—"}</td>
                              <td style={{padding:"8px 7px",textAlign:"right",fontWeight:900,color:C.teal,fontSize:12}}>{fmt(r.netBill)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{background:C.navy,color:"#fff",fontWeight:700}}>
                          <td colSpan={7} style={{padding:"10px 8px",fontSize:12}}>TOTAL</td>
                          <td style={{padding:"10px 8px",textAlign:"right"}}>{fmt(sumK(billingRows,"basicBill"))}</td>
                          <td></td><td></td>
                          <td style={{padding:"10px 8px",textAlign:"right"}}>{fmt(sumK(billingRows,"lhBill"))}</td>
                          <td></td><td></td>
                          <td style={{padding:"10px 8px",textAlign:"right"}}>{fmt(sumK(billingRows,"shBill"))}</td>
                          <td></td><td></td>
                          <td style={{padding:"10px 8px",textAlign:"right"}}>{fmt(sumK(billingRows,"nsBill"))}</td>
                          <td></td>
                          <td style={{padding:"10px 8px",textAlign:"right"}}>{fmt(sumK(billingRows,"straightBill"))}</td>
                          <td></td>
                          <td style={{padding:"10px 8px",textAlign:"right"}}>{fmt(sumK(billingRows,"extraBill"))}</td>
                          <td style={{padding:"10px 8px",textAlign:"right"}}>{fmt(sumK(billingRows,"subTotal"))}</td>
                          <td style={{padding:"10px 8px",textAlign:"right"}}>{fmt(sumK(billingRows,"insurance"))}</td>
                          <td></td><td></td>
                          <td style={{padding:"10px 8px",textAlign:"right"}}>{fmt(sumK(billingRows,"utBill"))}</td>
                          <td style={{padding:"10px 8px",textAlign:"right",fontSize:13}}>{fmt(sumK(billingRows,"netBill"))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Total due box */}
                  <div style={{padding:"16px 24px",borderTop:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:13,color:"#6b7280"}}>
                      <div>INV. NO. {invNo}</div>
                      <div>Prepared by: <b style={{color:C.navy}}>{prepBy}</b></div>
                    </div>
                    <div style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`,color:"#fff",borderRadius:10,padding:"12px 24px",textAlign:"right"}}>
                      <div style={{fontSize:11,opacity:0.8}}>TOTAL AMOUNT DUE</div>
                      <div style={{fontWeight:900,fontSize:24}}>{fmt(sumK(billingRows,"netBill"))}</div>
                    </div>
                  </div>
                </div>
              )
            }
          </div>
        )}


        {/* ══ P&L ══ */}
        {tab==="P&L"&&(()=>{
          // ── Revenue: total billing from all hospitals ──
          const allBillingRows = employees.map(e=>({
            emp:e, att:getAtt(e.id), ...computeBilling(e, getAtt(e.id))
          }));
          const totalRevenue = sumK(allBillingRows,"netBill");

          // ── COGS: total net payroll (what employees actually receive) ──
          const totalNetPayroll = sumK(allPayroll,"netPay");
          // Total gross payroll (what employees are owed before deductions)
          const totalGrossPayroll = sumK(allPayroll,"subTotal");

          // ── Auto-calculate employer govt contributions from actual employees ──
          const empGovtSSS = allPayroll.reduce((s,p)=>{
            const g = p.emp.isSupervisor ? GOVT_EMP.supervisor : GOVT_EMP.janitor;
            return s + g.sss/2;
          },0);
          const empGovtPH = allPayroll.reduce((s,p)=>{
            const g = p.emp.isSupervisor ? GOVT_EMP.supervisor : GOVT_EMP.janitor;
            return s + g.philhealth/2;
          },0);
          const empGovtEC = allPayroll.reduce((s,p)=>{
            const g = p.emp.isSupervisor ? GOVT_EMP.supervisor : GOVT_EMP.janitor;
            return s + g.ec/2;
          },0);
          const empGovtHDMF = allPayroll.reduce((s,p)=>{
            const g = p.emp.isSupervisor ? GOVT_EMP.supervisor : GOVT_EMP.janitor;
            return s + g.pagibig/2;
          },0);

          // Update auto-computed govt contributions in expense list
          const displayExpenses = pnlExpenses.map(e=>{
            if(e.id===6) return {...e, amount:r2(empGovtSSS)};
            if(e.id===7) return {...e, amount:r2(empGovtPH)};
            if(e.id===8) return {...e, amount:r2(empGovtEC)};
            if(e.id===9) return {...e, amount:r2(empGovtHDMF)};
            return e;
          });

          const totalOverhead = displayExpenses.filter(e=>e.category==="overhead").reduce((s,e)=>s+r2(e.amount||0),0);
          const totalLabourCost = displayExpenses.filter(e=>e.category==="labor").reduce((s,e)=>s+r2(e.amount||0),0);
          const totalExpenses = r2(totalOverhead + totalLabourCost + totalGrossPayroll);
          const grossProfit = r2(totalRevenue - totalGrossPayroll);
          const netProfit = r2(totalRevenue - totalExpenses);
          const margin = totalRevenue > 0 ? (netProfit/totalRevenue*100).toFixed(1) : 0;

          const isProfit = netProfit >= 0;

          const SRow = ({label,value,bold,green,red,indent,border})=>(
            <div style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",
              borderTop:border?"2px solid "+C.border:"1px solid #f0f0f0",
              background:bold?"#f4f6f9":"#fff"}}>
              <span style={{fontSize:13,paddingLeft:indent?16:0,color:red?C.red:green?C.teal:"#374151",fontWeight:bold?700:400}}>{label}</span>
              <span style={{fontSize:13,fontWeight:bold?800:600,color:red?C.red:green?C.teal:"#1f2937"}}>{fmt(value)}</span>
            </div>
          );

          return (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{margin:0,color:C.navy,fontWeight:900}}>Profit & Loss — {periodStr}</h2>
              <div style={{fontSize:12,color:"#6b7280"}}>Rough estimate for internal use</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>

              {/* ── LEFT: P&L STATEMENT ── */}
              <div>
                <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
                  <div style={{background:C.navy,color:"#fff",padding:"13px 18px",fontWeight:800,fontSize:15}}>
                    📊 P&L Statement
                  </div>

                  {/* Revenue */}
                  <div style={{background:C.teal,color:"#fff",padding:"8px 12px",fontWeight:700,fontSize:12,letterSpacing:0.5}}>REVENUE</div>
                  <SRow label="Total Billing (All Hospitals)" value={totalRevenue} bold green />
                  <SRow indent label={`Prime Hospital (${employees.filter(e=>e.hospital.includes("PRIME")).length} staff)`}
                    value={sumK(allBillingRows.filter(r=>r.emp.hospital.includes("PRIME")),"netBill")} />
                  <SRow indent label={`Unihealth Parañaque (${employees.filter(e=>e.hospital.includes("UNIHEALTH")).length} staff)`}
                    value={sumK(allBillingRows.filter(r=>r.emp.hospital.includes("UNIHEALTH")),"netBill")} />

                  {/* COGS */}
                  <div style={{background:"#dc2626",color:"#fff",padding:"8px 12px",fontWeight:700,fontSize:12,letterSpacing:0.5,marginTop:4}}>COST OF SERVICES (PAYROLL)</div>
                  <SRow label="Total Gross Payroll" value={totalGrossPayroll} bold red />
                  <SRow indent label={`Prime Hospital (${employees.filter(e=>e.hospital.includes("PRIME")).length} staff)`}
                    value={sumK(allPayroll.filter(p=>p.emp.hospital.includes("PRIME")),"subTotal")} />
                  <SRow indent label={`Unihealth Parañaque (${employees.filter(e=>e.hospital.includes("UNIHEALTH")).length} staff)`}
                    value={sumK(allPayroll.filter(p=>p.emp.hospital.includes("UNIHEALTH")),"subTotal")} />

                  <SRow label="GROSS PROFIT" value={grossProfit} bold border green={grossProfit>=0} red={grossProfit<0} />

                  {/* Operating Expenses */}
                  <div style={{background:C.amber,color:"#fff",padding:"8px 12px",fontWeight:700,fontSize:12,letterSpacing:0.5,marginTop:4}}>OPERATING EXPENSES</div>
                  {displayExpenses.filter(e=>e.category==="overhead").map(e=>(
                    <SRow key={e.id} indent label={e.label} value={r2(e.amount||0)} />
                  ))}
                  <div style={{background:"#f3f4f6",padding:"8px 12px",fontWeight:700,fontSize:12,letterSpacing:0.5,marginTop:2}}>EMPLOYER GOVT CONTRIBUTIONS (auto)</div>
                  {displayExpenses.filter(e=>e.category==="labor").map(e=>(
                    <SRow key={e.id} indent label={`${e.label} (${employees.length} staff)`} value={r2(e.amount||0)} />
                  ))}
                  <SRow label="TOTAL EXPENSES" value={r2(totalOverhead+totalLabourCost)} bold border red />

                  {/* Net */}
                  <div style={{padding:"14px 18px",background:isProfit?"#f0fdf4":"#fef2f2",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"2px solid "+(isProfit?C.teal:C.red)}}>
                    <div>
                      <div style={{fontWeight:900,fontSize:16,color:isProfit?C.teal:C.red}}>{isProfit?"NET PROFIT ✅":"NET LOSS ⚠️"}</div>
                      <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Margin: {margin}%</div>
                    </div>
                    <div style={{fontWeight:900,fontSize:28,color:isProfit?C.teal:C.red}}>{fmt(netProfit)}</div>
                  </div>
                </div>
              </div>

              {/* ── RIGHT: EXPENSE INPUTS ── */}
              <div>
                {/* Summary Cards */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
                  {[
                    {label:"Total Revenue",     value:totalRevenue,      color:C.teal,  icon:"💰"},
                    {label:"Total Payroll",      value:totalGrossPayroll, color:C.red,   icon:"👥"},
                    {label:"Other Expenses",     value:r2(totalOverhead+totalLabourCost), color:C.amber, icon:"📋"},
                    {label:isProfit?"Net Profit":"Net Loss", value:Math.abs(netProfit), color:isProfit?C.teal:C.red, icon:isProfit?"📈":"📉"},
                  ].map(card=>(
                    <div key={card.label} style={{background:"#fff",borderRadius:10,padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:"4px solid "+card.color}}>
                      <div style={{fontSize:11,color:"#6b7280",fontWeight:600}}>{card.icon} {card.label}</div>
                      <div style={{fontWeight:900,fontSize:18,color:card.color,marginTop:4}}>{fmt(card.value)}</div>
                    </div>
                  ))}
                </div>

                {/* Expense Editor */}
                <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                  <div style={{background:C.amber,color:"#fff",padding:"13px 18px",fontWeight:800,fontSize:14}}>
                    ✏️ Operating Expenses
                  </div>
                  <div style={{padding:16}}>
                    {pnlExpenses.filter(e=>e.category==="overhead").map(e=>(
                      <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                        <div style={{flex:1,fontSize:13,color:"#374151",fontWeight:500}}>{e.label}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:12,color:"#9ca3af"}}>₱</span>
                          <input type="number" min="0" value={e.amount}
                            onChange={ev=>setPnlExpenses(p=>p.map(x=>x.id===e.id?{...x,amount:parseFloat(ev.target.value)||0}:x))}
                            style={{width:110,padding:"6px 10px",borderRadius:6,border:"1.5px solid "+C.border,fontSize:13,textAlign:"right"}}/>
                          <button onClick={()=>setPnlExpenses(p=>p.filter(x=>x.id!==e.id))}
                            style={{background:"#fef2f2",color:C.red,border:"none",borderRadius:5,padding:"5px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>✕</button>
                        </div>
                      </div>
                    ))}

                    <div style={{background:"#f3f4f6",borderRadius:8,padding:"10px 12px",marginTop:8,marginBottom:14}}>
                      <div style={{fontSize:11,color:"#6b7280",fontWeight:700,marginBottom:8}}>EMPLOYER GOVT CONTRIBUTIONS (auto-computed)</div>
                      {displayExpenses.filter(e=>e.category==="labor").map(e=>(
                        <div key={e.id} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:12,color:"#555"}}>
                          <span>{e.label}</span><span style={{fontWeight:600}}>{fmt(r2(e.amount||0))}</span>
                        </div>
                      ))}
                    </div>

                    {/* Add new expense */}
                    <div style={{borderTop:"1.5px dashed "+C.border,paddingTop:14}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#6b7280",marginBottom:8}}>ADD NEW EXPENSE</div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input placeholder="Expense label" value={newExp.label}
                          onChange={e=>setNewExp(p=>({...p,label:e.target.value}))}
                          style={{flex:1,padding:"7px 10px",borderRadius:6,border:"1.5px solid "+C.border,fontSize:13}}/>
                        <input type="number" placeholder="Amount" min="0" value={newExp.amount}
                          onChange={e=>setNewExp(p=>({...p,amount:e.target.value}))}
                          style={{width:100,padding:"7px 10px",borderRadius:6,border:"1.5px solid "+C.border,fontSize:13,textAlign:"right"}}/>
                        <button onClick={()=>{
                          if(!newExp.label||!newExp.amount) return;
                          setPnlExpenses(p=>[...p,{id:Date.now(),label:newExp.label,amount:parseFloat(newExp.amount)||0,category:"overhead"}]);
                          setNewExp({label:"",amount:"",category:"overhead"});
                        }} style={{background:C.teal,color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",fontWeight:700,cursor:"pointer",fontSize:13}}>+ Add</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}


        {/* ══ PAYABLES ══ */}
        {tab==="Payables"&&(()=>{
          // ── All billing rows (both hospitals) ─────────────────────────────
          const allBillingRows = employees.map(e=>({
            emp:e, att:getAtt(e.id), ...computeBilling(e, getAtt(e.id))
          }));

          // ── VAT Computation ───────────────────────────────────────────────
          // VAT is based on Gross Receipts (before govt contributions) per contract
          // Gross Receipts = total billing net / (1 + 0.12) * 0.12  would be wrong
          // Per contract: VAT = Gross Receipts × 12%, where Gross = totalEmp + adminFee
          // Simplest: derive from billing rows — billing already includes VAT in the rate
          // VAT per employee per cutoff = (monthly contract rate × 0.12 / (1.12)) / 2... 
          // Actually from contract: Gross Receipts × 12% — we track this from billing daily
          // VAT portion = billingDaily * FACTOR * VAT_RATE / (1+VAT_RATE) per semi-monthly
          // But cleaner: VAT_cutoff = netBill * (VAT / (1 + VAT)) for each row
          // Actually the contract formula: billing rate INCLUDES vat already
          // VAT = gross_receipts * 0.12, gross receipts = billing - govt employer share
          // Let's compute per employee: grossReceipts = (monthlyBilling/2) - govtTotal/2
          const vatTotal = allBillingRows.reduce((s, r) => {
            const govtMonthly = (r.emp.isSupervisor ? GOVT_EMP.supervisor : GOVT_EMP.janitor);
            const govtSM = (govtMonthly.sss + govtMonthly.philhealth + govtMonthly.ec + govtMonthly.pagibig) / 2;
            const grossReceipts = r2(r.smb - govtSM);
            const vat = r2(grossReceipts * (VAT / (1 + VAT)));
            return s + vat;
          }, 0);

          const vatMonthly = r2(vatTotal * 2);   // both cutoffs
          const vatQuarterly = r2(vatMonthly * 3);

          // ── SSS Payables ──────────────────────────────────────────────────
          // Employee share (deducted from payroll) per cutoff
          const sssEmpShare = r2(sumK(allPayroll, "sss"));
          // Employer share per cutoff
          const sssErShare = r2(allPayroll.reduce((s,p) => {
            const g = p.emp.isSupervisor ? GOVT_EMP.supervisor : GOVT_EMP.janitor;
            return s + g.sss / 2;
          }, 0));
          const sssTotalCutoff = r2(sssEmpShare + sssErShare);
          const sssTotalMonthly = r2(sssTotalCutoff * 2);

          // ── PhilHealth Payables ───────────────────────────────────────────
          const phEmpShare = r2(sumK(allPayroll, "philhealth"));
          const phErShare = r2(allPayroll.reduce((s,p) => {
            const g = p.emp.isSupervisor ? GOVT_EMP.supervisor : GOVT_EMP.janitor;
            return s + g.philhealth / 2;
          }, 0));
          const phTotalCutoff = r2(phEmpShare + phErShare);
          const phTotalMonthly = r2(phTotalCutoff * 2);

          // ── Pag-IBIG Payables ─────────────────────────────────────────────
          const hdmfEmpShare = r2(sumK(allPayroll, "hdmf"));
          const hdmfErShare = r2(allPayroll.reduce((s,p) => {
            const g = p.emp.isSupervisor ? GOVT_EMP.supervisor : GOVT_EMP.janitor;
            return s + g.pagibig / 2;
          }, 0));
          const hdmfTotalCutoff = r2(hdmfEmpShare + hdmfErShare);
          const hdmfTotalMonthly = r2(hdmfTotalCutoff * 2);

          // ── EC Insurance ──────────────────────────────────────────────────
          const ecTotal = r2(allPayroll.reduce((s,p) => {
            const g = p.emp.isSupervisor ? GOVT_EMP.supervisor : GOVT_EMP.janitor;
            return s + g.ec / 2;
          }, 0));

          // ── Loan remittances ──────────────────────────────────────────────
          const sssLoanRemit   = r2(sumK(allPayroll, "sssLoans"));
          const hdmfLoanRemit  = r2(sumK(allPayroll, "hdmfLoans"));

          // ── Supplies ─────────────────────────────────────────────────────
          const supplies = parseFloat(suppliesAmt) || 0;

          // ── Grand Total Payables this cutoff ─────────────────────────────
          const grandTotal = r2(sssTotalCutoff + phTotalCutoff + hdmfTotalCutoff + ecTotal + sssLoanRemit + hdmfLoanRemit + vatTotal + supplies);

          const Card = ({title, icon, color, children}) => (
            <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.07)",marginBottom:18}}>
              <div style={{background:color,color:"#fff",padding:"11px 18px",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",gap:8}}>
                <span>{icon}</span><span>{title}</span>
              </div>
              <div>{children}</div>
            </div>
          );

          const Row = ({label,value,sub,bold,indent,highlight,red,green,border})=>(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding: "9px 18px",
              background: highlight?"#fffbeb":bold?"#f8fafc":"#fff",
              borderTop: border?"2px solid #e5e7eb":"1px solid #f3f4f6"}}>
              <div>
                <div style={{fontSize:13,fontWeight:bold?700:400,color:red?C.red:green?C.teal:"#374151",paddingLeft:indent?16:0}}>{label}</div>
                {sub&&<div style={{fontSize:11,color:"#9ca3af",paddingLeft:indent?16:0,marginTop:1}}>{sub}</div>}
              </div>
              <div style={{fontWeight:bold?800:600,fontSize:bold?14:13,color:red?C.red:green?C.teal:highlight?C.amber:"#1f2937",textAlign:"right"}}>
                {fmt(value)}
              </div>
            </div>
          );

          const monthLabel = new Date(month+"-02").toLocaleString("en-PH",{month:"long",year:"numeric"});
          const [mo, yr] = [monthLabel.split(" ")[0], monthLabel.split(" ")[1]];
          const qtr = Math.ceil((new Date(month+"-02").getMonth()+1)/3);

          return (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <h2 style={{margin:0,color:C.navy,fontWeight:900}}>Government & Other Payables</h2>
                <div style={{fontSize:12,color:"#6b7280",marginTop:3}}>{periodStr} • Q{qtr} {yr}</div>
              </div>
              {/* Grand Total Banner */}
              <div style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`,color:"#fff",borderRadius:12,padding:"12px 24px",textAlign:"right"}}>
                <div style={{fontSize:11,opacity:0.8}}>TOTAL PAYABLES THIS CUT-OFF</div>
                <div style={{fontWeight:900,fontSize:24}}>{fmt(grandTotal)}</div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

              {/* ── LEFT COLUMN ── */}
              <div>

                {/* SSS */}
                <Card title="SSS Contributions" icon="🏦" color="#1d4ed8">
                  <Row label="Employee Share (deducted from payroll)" value={sssEmpShare}
                    sub={`${employees.length} employees × avg ₱${r2(sssEmpShare/employees.length).toFixed(2)}`} indent />
                  <Row label="Employer Share" value={sssErShare}
                    sub="Hygeia's obligation per contract" indent />
                  <Row label="TOTAL SSS CONTRIBUTION" value={sssTotalCutoff} bold border />
                  <Row label="Monthly (both cutoffs)" value={sssTotalMonthly} sub="Due every 10th of following month" indent />

                  {sssLoanRemit > 0 && <>
                    <div style={{background:"#eff6ff",padding:"7px 18px",fontSize:11,fontWeight:700,color:"#1d4ed8",borderTop:"1px solid #dbeafe"}}>
                      SSS LOAN REMITTANCES (separate from contributions)
                    </div>
                    <Row label="SSS Salary Loans collected" value={sssLoanRemit}
                      sub="Amount deducted from employees — remit to SSS" indent />
                  </>}
                </Card>

                {/* PhilHealth */}
                <Card title="PhilHealth Contributions" icon="💊" color="#059669">
                  <Row label="Employee Share (2.5%)" value={phEmpShare}
                    sub={`Deducted from payroll — ${employees.length} employees`} indent />
                  <Row label="Employer Share (2.5%)" value={phErShare}
                    sub="Hygeia's obligation" indent />
                  <Row label="TOTAL PHILHEALTH" value={phTotalCutoff} bold border />
                  <Row label="Monthly (both cutoffs)" value={phTotalMonthly} sub="Due every 10th of following month" indent />
                </Card>

                {/* Supplies */}
                <Card title="Cleaning Supplies" icon="🧹" color="#7c3aed">
                  <div style={{padding:"14px 18px"}}>
                    <div style={{fontSize:12,color:"#6b7280",marginBottom:8}}>Enter supplies cost for this cut-off period:</div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:13,fontWeight:600}}>₱</span>
                      <input type="number" min="0" value={suppliesAmt}
                        onChange={e=>setSuppliesAmt(e.target.value)}
                        placeholder="0.00"
                        style={{flex:1,padding:"9px 12px",borderRadius:7,border:"1.5px solid #dde3ed",fontSize:16,fontWeight:700,textAlign:"right"}}/>
                    </div>
                    <div style={{fontSize:11,color:"#9ca3af",marginTop:6}}>
                      Note: Per contract, cleaning supplies are billed separately to the client
                    </div>
                  </div>
                  {supplies>0&&<Row label="Supplies this cut-off" value={supplies} bold />}
                  {supplies>0&&<Row indent label="Monthly estimate" value={r2(supplies*2)} sub="Both cutoffs combined" />}
                </Card>
              </div>

              {/* ── RIGHT COLUMN ── */}
              <div>

                {/* Pag-IBIG */}
                <Card title="Pag-IBIG / HDMF" icon="🏠" color="#b45309">
                  <Row label="Employee Share (2%, max ₱100)" value={hdmfEmpShare}
                    sub="Deducted from payroll" indent />
                  <Row label="Employer Share (2%, max ₱100)" value={hdmfErShare}
                    sub="Hygeia's obligation" indent />
                  <Row label="TOTAL PAG-IBIG" value={hdmfTotalCutoff} bold border />
                  <Row label="Monthly (both cutoffs)" value={hdmfTotalMonthly} sub="Due every 10th of following month" indent />

                  {hdmfLoanRemit > 0 && <>
                    <div style={{background:"#fef3c7",padding:"7px 18px",fontSize:11,fontWeight:700,color:"#92400e",borderTop:"1px solid #fde68a"}}>
                      PAG-IBIG LOAN REMITTANCES (separate from contributions)
                    </div>
                    <Row label="MPL / Calamity loans collected" value={hdmfLoanRemit}
                      sub="Amount deducted from employees — remit to HDMF" indent />
                  </>}
                </Card>

                {/* EC Insurance */}
                <Card title="EC Insurance (Employer Only)" icon="🛡️" color="#64748b">
                  <Row label="EC Insurance per cut-off" value={ecTotal}
                    sub={`₱30/mo per employee × ${employees.length} staff ÷ 2`} indent />
                  <Row label="Monthly" value={r2(ecTotal*2)} bold border />
                </Card>

                {/* VAT */}
                <Card title="VAT (Value Added Tax — 12%)" icon="🧾" color="#dc2626">
                  <Row label="VAT this cut-off" value={vatTotal}
                    sub="Based on gross receipts from billing" indent />
                  <Row label="VAT this month (both cutoffs)" value={vatMonthly} bold border />
                  <Row label="Q{qtr} {yr} Quarterly VAT (estimate)" value={vatQuarterly}
                    sub="3 months × monthly VAT — file quarterly BIR Form 2550Q" indent highlight />
                  <div style={{padding:"10px 18px",background:"#fef2f2",borderTop:"1px solid #fee2e2"}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.red,marginBottom:4}}>📅 VAT Filing Deadlines</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>
                      Q1 (Jan–Mar): Due <b>April 25</b><br/>
                      Q2 (Apr–Jun): Due <b>July 25</b><br/>
                      Q3 (Jul–Sep): Due <b>October 25</b><br/>
                      Q4 (Oct–Dec): Due <b>January 25</b>
                    </div>
                  </div>
                </Card>

                {/* Summary of all payables */}
                <Card title="Summary — All Payables This Cut-off" icon="📋" color={C.navy}>
                  <Row label="SSS Contributions" value={sssTotalCutoff} indent />
                  <Row label="SSS Loan Remittances" value={sssLoanRemit} indent />
                  <Row label="PhilHealth" value={phTotalCutoff} indent />
                  <Row label="Pag-IBIG Contributions" value={hdmfTotalCutoff} indent />
                  <Row label="Pag-IBIG Loan Remittances" value={hdmfLoanRemit} indent />
                  <Row label="EC Insurance" value={ecTotal} indent />
                  <Row label="VAT" value={vatTotal} indent />
                  {supplies>0&&<Row label="Cleaning Supplies" value={supplies} indent />}
                  <Row label="GRAND TOTAL PAYABLES" value={grandTotal} bold border green />
                  <div style={{padding:"8px 18px 12px",fontSize:11,color:"#9ca3af"}}>
                    * Govt contributions (SSS, PhilHealth, Pag-IBIG) are due on the 10th of the following month.<br/>
                    * Loan remittances must be filed separately from contributions.<br/>
                    * VAT is filed quarterly via BIR Form 2550Q.
                  </div>
                </Card>

              </div>
            </div>
          </div>
          );
        })()}

      </div>
    </div>
  );
}

// Mini payslip for batch print (2-up on A4)
function MiniPayslip({emp,p,att,loans,period,month}) {
  const monthStr = new Date(month+"-02").toLocaleString("en-PH",{month:"long",year:"numeric"});
  const [d1,d2] = period==="1st"?["1","15"]:["16","31"];
  const periodStr = `${monthStr.split(" ")[0].toUpperCase()} ${d1}-${d2}, ${monthStr.split(" ")[1]}`;

  return (
    <div style={{border:"2px solid #1a3558",borderRadius:6,overflow:"hidden",fontSize:8.5,fontFamily:"'Calibri',Arial,sans-serif",pageBreakInside:"avoid"}}>
      <div style={{background:"#1a3558",color:"#fff",padding:"8px 12px"}}>
        <div style={{fontWeight:900,fontSize:11}}>HYGEIA SERVICE PHILIPPINES CORP.</div>
        <div style={{fontSize:7.5,opacity:0.8}}>PAYSLIP — {periodStr}</div>
      </div>
      <div style={{background:"#f4f6f9",padding:"6px 12px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,fontSize:8}}>
        <div><b>{emp.surname}, {emp.name}</b></div>
        <div>{emp.isSupervisor?"Supervisor":"Janitor"}</div>
        <div>SSS: {emp.sssNo}</div>
        <div>Daily: {fmt(emp.dailyPayroll)}</div>
      </div>
      <div style={{padding:"4px 12px 8px"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:8}}>
          <tbody>
            <tr style={{fontWeight:700,color:"#1a3558",borderBottom:"1px solid #dde3ed"}}><td colSpan={2} style={{padding:"3px 0"}}>EARNINGS</td></tr>
            <tr><td style={{padding:"1px 0",paddingLeft:8}}>Basic Pay</td><td style={{textAlign:"right"}}>{fmtN(p.basicPay)}</td></tr>
            {p.lhAmt>0&&<tr><td style={{padding:"1px 0",paddingLeft:8}}>Legal Holiday</td><td style={{textAlign:"right"}}>{fmtN(p.lhAmt)}</td></tr>}
            {p.shAmt>0&&<tr><td style={{padding:"1px 0",paddingLeft:8}}>Special Holiday</td><td style={{textAlign:"right"}}>{fmtN(p.shAmt)}</td></tr>}
            {p.nsAmt>0&&<tr><td style={{padding:"1px 0",paddingLeft:8}}>Night Shift</td><td style={{textAlign:"right"}}>{fmtN(p.nsAmt)}</td></tr>}
            {p.otAmt>0&&<tr><td style={{padding:"1px 0",paddingLeft:8}}>Overtime</td><td style={{textAlign:"right"}}>{fmtN(p.otAmt)}</td></tr>}
            {p.straightAmt>0&&<tr><td style={{padding:"1px 0",paddingLeft:8}}>Straight Duty</td><td style={{textAlign:"right"}}>{fmtN(p.straightAmt)}</td></tr>}
            {p.extraAmt>0&&<tr><td style={{padding:"1px 0",paddingLeft:8}}>Extra/Day-off</td><td style={{textAlign:"right"}}>{fmtN(p.extraAmt)}</td></tr>}
            <tr style={{fontWeight:700,color:"#1a3558",borderTop:"1px solid #dde3ed"}}><td style={{padding:"3px 0"}}>SUB-TOTAL</td><td style={{textAlign:"right"}}>{fmtN(p.subTotal)}</td></tr>
            <tr style={{fontWeight:700,color:"#c0392b",borderBottom:"1px solid #dde3ed"}}><td colSpan={2} style={{padding:"3px 0"}}>DEDUCTIONS</td></tr>
            <tr style={{color:"#c0392b"}}><td style={{padding:"1px 0",paddingLeft:8}}>SSS</td><td style={{textAlign:"right"}}>{fmtN(p.sss)}</td></tr>
            <tr style={{color:"#c0392b"}}><td style={{padding:"1px 0",paddingLeft:8}}>PhilHealth</td><td style={{textAlign:"right"}}>{fmtN(p.philhealth)}</td></tr>
            <tr style={{color:"#c0392b"}}><td style={{padding:"1px 0",paddingLeft:8}}>Pag-IBIG</td><td style={{textAlign:"right"}}>{fmtN(p.hdmf)}</td></tr>
            {loans.map(l=><tr key={l.id} style={{color:"#b45309"}}><td style={{padding:"1px 0",paddingLeft:8}}>{l.type}</td><td style={{textAlign:"right"}}>{fmtN(l.monthly/2)}</td></tr>)}
            {p.medFee>0&&<tr style={{color:"#7c3aed"}}><td style={{padding:"1px 0",paddingLeft:8}}>Medical Fee</td><td style={{textAlign:"right"}}>{fmtN(p.medFee)}</td></tr>}
            {p.vale>0&&<tr style={{color:"#7c3aed"}}><td style={{padding:"1px 0",paddingLeft:8}}>Vale</td><td style={{textAlign:"right"}}>{fmtN(p.vale)}</td></tr>}
            {p.utAmt>0&&<tr style={{color:"#7c3aed"}}><td style={{padding:"1px 0",paddingLeft:8}}>Undertime</td><td style={{textAlign:"right"}}>{fmtN(p.utAmt)}</td></tr>}
            <tr style={{fontWeight:700,color:"#c0392b",borderTop:"1px solid #dde3ed"}}><td style={{padding:"3px 0"}}>TOTAL DEDUCTIONS</td><td style={{textAlign:"right"}}>{fmtN(p.totalDed)}</td></tr>
          </tbody>
        </table>
        <div style={{background:"#1a3558",color:"#fff",borderRadius:4,padding:"5px 8px",display:"flex",justifyContent:"space-between",marginTop:4}}>
          <span style={{fontWeight:800,fontSize:9}}>NET PAY</span>
          <span style={{fontWeight:900,fontSize:13}}>{fmt(p.netPay)}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:10}}>
          <div style={{borderTop:"1px solid #aaa",paddingTop:3,textAlign:"center",fontSize:7,color:"#888"}}>Employee Signature</div>
          <div style={{borderTop:"1px solid #aaa",paddingTop:3,textAlign:"center",fontSize:7,color:"#888"}}>Authorized Signatory</div>
        </div>
      </div>
    </div>
  );
}
