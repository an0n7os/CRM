# IT & Solar CRM — ഉപയോഗിക്കാനുള്ള ചെറിയ ഗൈഡ് (Malayalam + English)

## തുടങ്ങാൻ (Getting started)
- **index.html** Chrome-ൽ double-click ചെയ്ത് തുറക്കുക. Internet വേണ്ട; data ഈ computer-ലെ Chrome-ൽ (IndexedDB) save ആകും.
- Login: നിങ്ങളുടെ പേര് select ചെയ്ത് **PIN** അടിക്കുക.
  Sample PINs — Owner **1111** · Sales **2222 / 2323** · Front desk **3333** · Technicians **4444 / 4545 / 4646** · Accounts **5555**
- ഓരോ role-നും അവരുടെ menu മാത്രം കാണും (Settings → Users-ൽ table ഉണ്ട്).
- ⚠️ **എല്ലാ ദിവസവും Backup എടുക്കുക** (Settings → Backup & restore). Chrome history/site data clear ചെയ്താൽ data പോകും.
- Real data തുടങ്ങുമ്പോൾ: Settings → Backup & restore → **Erase all data & start fresh**. എന്നിട്ട് Users-ൽ PIN മാറ്റുക, Business-ൽ GSTIN, bank, UPI, logo ചേർക്കുക.

---

## 🏠 Dashboard
ഇന്നത്തെ follow-ups, open jobs (stage തിരിച്ച്), ഈ മാസത്തെ revenue, ഇന്നത്തെ collection, pending dues, low stock, AMC renewals, delivery-ക്ക് ready ആയ devices.
Tile-ൽ tap ചെയ്താൽ ആ list തുറക്കും. Sales-ന് സ്വന്തം target progress കാണാം.

## 📇 Leads
- **+ New lead** → name, phone (10 digit), WhatsApp, area, category, source, budget, salesperson, hot/warm/cold, next follow-up.
- Category select ചെയ്താൽ അതിന്റെ fields വരും (CCTV: cameras, IP/HD… Solar: KSEB bill, consumer no, roof, kW…).
- List-ൽ search, filters (category, source, score, staff, status, follow-up due). Orange row = follow-up overdue.
- Lead തുറന്നാൽ: 📞 Call, **WhatsApp**, **Log call** (call count performance-ൽ വരും), Edit, **Mark lost** (reason നിർബന്ധം).
- "Related work"-ൽ ന�## 🔧 Job Cards (chip-level service)
- **+ New job card** → customer, device, brand, model, serial, complaint, accessories checklist, password, physical condition, est. delivery, technician, photos.
- Job card-ൽ: photos add, **Add part** (stock-ൽ നിന്ന് കുറയും), **Approval log** (estimate sent / approved), stage stepper.
- **🖨️ Print job card** → **QR code** ഉൾപ്പെടെ customer signature box ഉള്ള printout. **WhatsApp** → job status / delivery ready message.
- Ready ആയാൽ **Mark delivered** → invoice ഉണ്ടാക്കാം. 30 ദിവസത്തിൽ കൂടുതൽ collect ചെയ്യാത്തത് red ആയി കാണിക്കും.

## 🔁 RMA & Brand Warranty Tracker
- കസ്റ്റമറുടെ കയ്യിൽ നിന്ന് വാറന്റി ക്ലെയിമിനായി ലഭിച്ച പാർട്സുകൾ (Motherboard, SSD, RAM, GPU, HDD, Camera മുതലായവ) കമ്പനി സർവീസ് സെന്ററിലേക്ക് അയക്കുന്നത് കൃത്യമായി ട്രാക്ക് ചെയ്യാം.
- **+ New RMA Entry** → Customer, Item, Serial No, Problem, Brand (Asus, Gigabyte, WD, Seagate...), Service Center, Courier AWB, Brand RMA Ticket No.
- Status: **Logged → Dispatched → In Process → Received (Replacement / Repaired) → Delivered**.
- കസ്റ്റമർക്ക് സ്റ്റാറ്റസ് മാറ്റങ്ങൾ അറിയിക്കാൻ 1-click **WhatsApp** സന്ദേശവും, ഇൻവേർഡ് അക്നോളജ്മെന്റിനായി **🖨️ Print Slip**-ഉം (QR code സഹിതം).

## 🖥️ Custom PC Builder
- ഗെയിമിംഗ്, എഡിറ്റിംഗ്, ഓഫീസ് ഡെസ്ക്ടോപ്പ് പിസികൾ അസംബിൾ ചെയ്യുന്നതിനുള്ള പ്രത്യേക ടൂൾ.
- CPU, Motherboard, RAM, SSD, GPU, SMPS, Cabinet, Monitor, Keyboard/Mouse എന്നിവ എളുപ്പത്തിൽ തിരഞ്ഞെടുക്കുക.
- **Office PC**, **Gaming / Editing PC** പ്രീസെറ്റുകൾ ലഭ്യമാണ്.
- പാർട്സ് കോസ്റ്റ്, ഷോപ്പ് മാർജിൻ %, അസംബ്ലി ലേബർ, 18% GST എന്നിവ ഓട്ടോമാറ്റിക്കായി കാൽക്കുലേറ്റ് ചെയ്യും.
- **Convert to Quotation** വഴി ഒറ്റ ക്ലിക്കിൽ കൊട്ടേഷൻ ആക്കാം അല്ലെങ്കിൽ **Print Spec Sheet** വഴി കസ്റ്റമർക്ക് സ്പെക് സ്ലിപ്പ് പ്രിന്റ് ചെയ്ത് നൽകാം.

## 📐 Site Surveys
- Project lead select ചെയ്ത് survey തുടങ്ങുക. Category checklist tick ചെയ്യുക, measurements (cable length, roof area…), notes, site photos. **Save survey**. Print report-ഉം ഉണ്ട്. ഇവിടെ നിന്ന് നേരിട്ട് quotation ഉണ്ടാക്കാം.

## 📝 Quotations
- Lead select ചെയ്യുമ്പോൾ cameras / kW അനുസരിച്ച് **package template** automatic ആയി വരും (4/8/16 camera, 1/3/5 kW).
- Item add, package add, **+ Labour**, **+ Cable (per m)**, discount, GST % (CGST+SGST; inter-state ആണെങ്കിൽ IGST tick).
- **New version** → v2, v3 (പഴയത് "Superseded"). **Print / PDF** → Save as PDF ചെയ്ത് WhatsApp-ൽ attach ചെയ്യാം.
- Solar quote-ൽ **☀️ Subsidy & payback** calculator (PM Surya Ghar subsidy, savings, payback years).
- **Convert to invoice** → invoice ആക്കാം.

## 📦 Inventory
- Items: HSN, rate, GST, stock, min stock. Red/orange = **low stock**. Serial number ഉള്ള items-ൽ ഓരോ serial-ന്റെയും status (in stock / issued / sold).
- **Stock in / Stock out**, **Issue to job** (project-ലേക്ക് material കൊടുക്കുമ്പോൾ — lead "Material issued" ആകും).
- **Purchases** tab → vendor bill entry → stock automatic ആയി കൂടും. **Vendors** list.

## 🧾 Billing & Dues
- **Invoice from lead** → quotation / job card items വരും; advance automatic ആയി adjust ആകും. Serial numbers pick ചെയ്യുക → warranty automatic ആയി start ആകും.
- **Quick sale bill** → walk-in counter sale.
- Payment modes: UPI, Cash, Bank, EMI, Card, Cheque. Advance + balance.
- **Due list** → days overdue സഹിതം; **Remind** button = WhatsApp payment reminder.
- Printable GST tax invoice — ബാങ്ക് വിവരങ്ങൾക്ക് പുറമെ നേരിട്ട് സ്കാൻ ചെയ്ത് പേ ചെയ്യാൻ കഴിയുന്ന **ഡൈനാമിക് UPI QR Code** ഉൾപ്പെടുത്തിയിട്ടുണ്ട്.

## 📒 Daybook & Shop Expenses
- **Daily Cash Register (Daybook)**: ഓരോ ദിവസത്തെയും ഓപ്പണിംഗ് ക്യാഷ്, അന്നത്തെ ക്യാഷ് കളക്ഷനുകൾ (Invoices/Bills), ക്യാഷ് ചിലവുകൾ, ബാക്കി ഡ്രോയറിൽ ഉണ്ടാകേണ്ട ക്യാഷ് ബാലൻസ് എന്നിവ കൃത്യമായി കാണാം.
- **Expense Ledger**: കൊറിയർ, ചായ/ലഘുഭക്ഷണം, പെട്രോൾ അലവൻസ്, ഷോപ്പ് ചിലവുകൾ തുടങ്ങിയവ രേഖപ്പെടുത്താനും മാസച്ചിലവുകൾ ചാർട്ട് സഹിതം കാണാനും Excel (CSV) ആയി എക്സ്പോർട്ട് ചെയ്യാനും സാധിക്കും.

## 🛡️ Warranty & AMC
- **Warranty by serial**: serial number search ചെയ്താൽ warranty എന്ന് വരെ എന്ന് കാണാം. 30 ദിവസത്തിനുള്ളിൽ തീരുന്നത് orange.
- **AMC contracts**: start date, months, visits/year കൊടുത്താൽ visit schedule automatic. 30 ദിവസം മുമ്പ് "Renewal due" + WhatsApp reminder. **Renew** button.
- **Complaint tickets**: Open → Assigned → In progress → Resolved → Closed. "Assign technician" → field job ഉണ്ടാകും; technician complete ചെയ്താൽ ticket Resolved ആകും.

## 🔑 Software & Antivirus Licenses
- QuickHeal, Kaspersky, NPAV, Windows 11, Microsoft 365, Tally Prime ലൈസൻസുകൾ രേഖപ്പെടുത്താം.
- ലൈസൻസ് കാലാവധി തീരുന്നതിന് 30 ദിവസം മുമ്പ് മുന്നറിയിപ്പ് കാണിക്കുകയും, 1-click **WhatsApp Remind** വഴി കസ്റ്റമർക്ക് റിന്യൂവൽ മെസ്സേജ് അയക്കുകയും ചെയ്യാം.
- **Renew** ബട്ടൺ വഴി കാലാവധി നീട്ടി നൽകാം.** → invoice ആക്കാം.

## 📦 Inventory
- Items: HSN, rate, GST, stock, min stock. Red/orange = **low stock**. Serial number ഉള്ള items-ൽ ഓരോ serial-ന്റെയും status (in stock / issued / sold).
- **Stock in / Stock out**, **Issue to job** (project-ലേക്ക് material കൊടുക്കുമ്പോൾ — lead "Material issued" ആകും).
- **Purchases** tab → vendor bill entry → stock automatic ആയി കൂടും. **Vendors** list.

## 🧾 Billing & Dues
- **Invoice from lead** → quotation / job card items വരും; advance automatic ആയി adjust ആകും. Serial numbers pick ചെയ്യുക → warranty automatic ആയി start ആകും.
- **Quick sale bill** → walk-in counter sale.
- Payment modes: UPI, Cash, Bank, EMI, Card, Cheque. Advance + balance.
- **Due list** → days overdue സഹിതം; **Remind** button = WhatsApp payment reminder.
- Printable GST tax invoice (HSN summary, amount in words, bank/UPI).

## 🛡️ Warranty & AMC
- **Warranty by serial**: serial number search ചെയ്താൽ warranty എന്ന് വരെ എന്ന് കാണാം. 30 ദിവസത്തിനുള്ളിൽ തീരുന്നത് orange.
- **AMC contracts**: start date, months, visits/year കൊടുത്താൽ visit schedule automatic. 30 ദിവസം മുമ്പ് "Renewal due" + WhatsApp reminder. **Renew** button.
- **Complaint tickets**: Open → Assigned → In progress → Resolved → Closed. "Assign technician" → field job ഉണ്ടാകും; technician complete ചെയ്താൽ ticket Resolved ആകും.

## 🧰 My Jobs Today (Technician)
1. രാവിലെ **📍 Check in** (time + GPS save ആകും).
2. ഓരോ job-നും buttons: **Assigned → Travelling → At site → Working → Completed**. ഓരോ tap-ഉം time + GPS save ചെയ്യും.
3. **Completed**-ന്: work photo നിർബന്ധം + customer **OTP** (WhatsApp-ൽ അയച്ച് customer-ൽ നിന്ന് വാങ്ങുക) **അല്ലെങ്കിൽ signature**. Customer rating (★) കൊടുക്കുക.
4. വൈകുന്നേരം **Check out** → km (GPS-ൽ നിന്ന് auto; വേണമെങ്കിൽ odometer നോക്കി മാറ്റാം) → travel claim.

## 📍 Field Tracking (Owner)
എല്ലാ technicians-ന്റെയും live status, current job, last update time, last location (map link), km today. **Unassigned jobs** → free technician-നെ select ചെയ്ത് **Assign** → technician-ന് WhatsApp alert. 60 sec-ൽ auto refresh.
(Tracking staff-ന്റെ consent-ഓടെ, duty time-ൽ മാത്രം.)

## 🕘 Attendance
Check-in / check-out time + GPS, hours, km, claim (Settings-ലെ ₹/km rate). Owner / Accounts: km edit, claim **Approve → Mark paid**. CSV export.

## 🏆 Performance
- Sales: leads, calls, quotes, won, conversion %, revenue vs monthly target, overdue follow-ups.
- Technicians: jobs done, on-time %, average job time, customer rating, rework within 30 days.
Period: this month / last month / quarter / financial year / custom.

## 📈 Reports
Date range + category filter. Revenue, collections, conversion, pending dues, AMC; **lead source vs conversion**, **revenue by category**, **12-month trend**, **sales funnel**, lost reasons, leaderboards, AMC renewals, top dues. **Export to Excel (CSV)** dropdown.

## 💬 WhatsApp buttons
എല്ലായിടത്തും "WhatsApp / Remind" button → message select ചെയ്യുക (Quotation, Job status, Delivery ready, Payment reminder, AMC reminder, Review request) → edit ചെയ്യാം → **Open WhatsApp** → Send അമർത്തുക.
Template-കൾ Settings → WhatsApp templates-ൽ മാറ്റാം ({name}, {amount} പോലുള്ള placeholders).

## ⚙️ Settings (Owner)
Business & GST details, logo, terms · Users (role, PIN, monthly target) · WhatsApp templates · Package templates · **Backup / Restore / Reset sample data / Erase all**.

---

### ശ്രദ്ധിക്കുക (Phase 1 limits)
- Data ഒരു computer-ലെ ഒരു browser-ൽ മാത്രം. Technician-ന്റെ phone-ൽ നിന്നുള്ള live GPS, multi-user sync → **Phase 2** (online database + hosting).
- WhatsApp messages wa.me വഴി തുറക്കും; Send നിങ്ങൾ തന്നെ അമർത്തണം (automatic sending = Phase 3, WhatsApp Business API).
- Solar subsidy rates, GST rates, km rate — current rates അനുസരിച്ച് Settings / item master-ൽ check ചെയ്ത് മാറ്റുക.
