import { TreeItem } from './FolderTreeEditor';

export interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  tree: TreeItem[];
}

// Helper function to convert indented text structure to TreeItem[]
const convertTextToTree = (text: string): TreeItem[] => {
  const lines = text.split('\n').filter(line => line.trim());
  const root: TreeItem = {
    id: '1',
    name: 'Root',
    type: 'folder',
    children: []
  };

  const stack: { item: TreeItem; level: number }[] = [{ item: root, level: -1 }];

  lines.forEach(line => {
    const indent = line.search(/\S/);
    const name = line.trim();
    const isFile = name.includes('(Document)');
    const cleanName = name.replace(' (Document)', '').replace(' (Folder)', '');

    while (stack.length > 1 && stack[stack.length - 1].level >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].item;
    const newItem: TreeItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: cleanName,
      type: isFile ? 'file' : 'folder',
      children: isFile ? undefined : []
    };

    if (!parent.children) parent.children = [];
    parent.children.push(newItem);

    if (!isFile) {
      stack.push({ item: newItem, level: indent });
    }
  });

  return [root];
};

const ansaradaStructure = `
01 Acquisitions and Disposals (Main Folder)
    01.01 Acquisition and Disposal Due Diligence Materials (Folder)
        01.01.01 Due Diligence Report on asset bought/sold (Document)
        01.01.02 Information Memorandum on asset bought/sold (Document)
        01.01.03 Management Presentation on asset bought or sold (Document)
    01.02 Acquisition and Disposal Decision Documentation (Folder)
        01.02.01 Board Minutes of decision (Document)
        01.02.02 Minutes of Investment Committee decision on acquisition or disposal (Document)
        01.02.03 Special resolutions related to acquisitions or disposals (Document)
        01.02.04 Transaction overview documents covering acquisitions or disposals (Document)
    01.03 Agreements related to Acquisitions and Disposals (Folder)
        01.03.01 Asset or company purchase / sale agreement (Document)
        01.03.02 Joint Venture Agreements (Document)
        01.03.03 Licence Agreements (if part of an acquisition or disposal) (Document)
        01.03.04 Management Agreement (if part of an acquisition or disposal) (Document)
        01.03.05 Sale & Purchase Agreement (or Share Purchase Agreement) for each acquisition or disposal (Document)
        01.03.06 Service Agreement (if part of an acquisition or disposal) (Document)
        01.03.07 Shareholder Agreement (for all non-wholly owned acquisitions) (Document)
        01.03.08 Supply agreement (if part of an acquisition or disposal) (Document)
        01.03.09 Transitional Service Agreements related to acquisition or disposals (Document)
    01.04 Legal documentation of acquisitions and disposals (Folder)
        01.04.01 Articles of Association (Document)
        01.04.02 Certificate of Title (Document)
        01.04.03 Documentation for Shareholder Loans related to acquisitions or disposals (Document)

02 Assets (Main Folder)
    02.01 Asset Registers (Folder)
        02.01.01 Aged stock (inventory) analysis (Document)
        02.01.02 Fixed asset register (incl. depreciation schedule) (Document)
        02.01.03 Inventory summary (Document)
        02.01.04 Leased asset list (Document)
    02.02 Asset Reports (Folder)
        02.02.01 Hazard site risk assessments (Document)
        02.02.02 Insurance reports (Document)
        02.02.03 Asset valuation reports (Document)
        02.02.04 Environmental risk assessments (Document)

03 Board and Management (Main Folder)
    03.01 Board Members (Folder)
        03.01.01 Board Member details (Biographies, Committees, Remuneration etc) (Document)
    03.02 Board Meetings (Folder)
        03.02.01 Board Meeting Materials (incl. all agendas, papers, minutes and resolutions) (Document)
    03.03 Board Reports and Registers (Folder)
        03.03.01 Audit Reports (Document)
        03.03.02 Risk Register (Document)

04 Contracts (Main Folder)
    04.01 Supplier and customer contracts (Folder)
        04.01.01 Supplier lists, schedules or summaries (Document)
        04.01.02 Supply agreements (Document)
        04.01.03 Service agreements (Document)
        04.01.04 Standard form (template) customer contracts or agreements (Document)
        04.01.05 Distribution agreements (Document)
        04.01.06 Production agreements (Document)
        04.01.07 Maintenance contracts or agreements (Document)
    04.02 Corporate agreements (Folder)
        04.02.01 Asset management agreements (Document)
        04.02.02 Concession agreements (Document)
        04.02.03 Consulting agreements (Document)
        04.02.04 Framework agreements (Document)
        04.02.05 Joint venture agreements (Document)
        04.02.06 Partnership agreements (Document)
    04.03 Leases or licenses (Folder)
        04.03.01 Property contracts, leases or deeds (Document)
        04.03.02 License agreements (Document)
    04.04 Other contract information (Folder)
        04.04.01 All other key agreements (Document)
        04.04.02 Register, schedule or list of all contracts or agreements (Document)

05 Corporate (Main Folder)
    05.01 Corporate overview and structure (Folder)
        05.01.01 Company overview (profile) (Document)
        05.01.02 Company structure (incl. charts etc) (Document)
    05.02 Corporate documentation (Folder)
        05.02.01 Business continuity plan (Document)
        05.02.02 Company constitution (articles of association) (Document)
        05.02.03 Evidence of incorporation or registration of the company (articles, certificates, name changes etc) (Document)
        05.02.04 Operation manual (staff handbook) (Document)

06 Customers and Marketing (Main Folder)
    06.01 Customers and Marketing, Policies and Procedures (Folder)
        06.01.01 Collection policy (Document)
        06.01.02 External communication protocol (Document)
        06.01.03 Invoice templates (Document)
        06.01.04 Standard form product or service contracts (Document)
    06.02 Product information (Folder)
        06.02.01 Detailed listings of products or services (Document)
        06.02.02 Pricing structures (Document)
        06.02.03 Product or service overviews (Document)
    06.03 Customer information and marketing strategy (Folder)
        06.03.01 Marketing strategy documentation (Document)
        06.03.02 Summary of key marketing metrics (Document)
        06.03.03 Top customer lists or customer summaries (Document)

07 Debt (Main Folder)
    07.01 Debt documentation (Folder)
        07.01.01 Convertible loan agreements (Document)
        07.01.02 Debt guarantees, indemnities or securities (Document)
        07.01.03 Facility or loan agreements (Document)
        07.01.04 Fee letters associated with debt facilities (Document)
        07.01.05 Finance leases (Document)
        07.01.06 Loan note documentation (Document)
        07.01.07 Other loan documentation (Document)
        07.01.08 Overdraft facilities (Document)
    07.02 Debt summary information (Folder)
        07.02.01 Fixed and floating charge register (Document)
        07.02.02 Register of all loans and other debt interests (Document)

08 Equity (Main Folder)
    08.01 Equity documentation (Folder)
        08.01.01 Common stock certificates (Document)
        08.01.02 Convertible share terms (Document)
        08.01.03 Option or warrant agreements (Document)
        08.01.04 Preference share terms (Document)
        08.01.05 Shareholder agreement (incl. amendments & variations) (Document)
        08.01.06 Subordination deed (Document)
        08.01.07 Subscription agreements (Document)
    08.02 Equity summary information (Folder)
        08.02.01 Capital structure (Document)
        08.02.02 Convertible share schedule (Document)
        08.02.03 Preference share schedule (Document)
        08.02.04 Schedule of options or warrants (Document)
        08.02.05 Shareholder (or member) list (or register) (Document)

09 Financials (Main Folder)
    09.01 Historic financials (Folder)
        09.01.01 Annual management reports (incl. all key financial statements) (Document)
        09.01.02 Monthly management reports (incl. all key financial statements) (Document)
        09.01.03 Quarterly or half-yearly management reports (incl. all key financial statements) (Document)
        09.01.04 Signed annual statutory reports (incl. all key financial statements) (Document)
        09.01.05 Signed quarterly or half-yearly statutory reports (incl. all key financial statements) (Document)
    09.02 Forecast financials (Folder)
        09.02.01 Annual budgets (Document)
        09.02.02 Annual forecasts (Document)
        09.02.03 Financial model (Document)
        09.02.04 Operating model (Document)
        09.02.05 Quarterly forecasts (Document)
    09.03 Financial audits (Folder)
        09.03.01 External audit certificates (Document)
        09.03.02 External audit reports (Document)
        09.03.03 Internal audit reports (Document)
    09.04 Other financial analysis (Folder)
        09.04.01 Cashflow analysis (Document)
        09.04.02 Creditor (accounts payable) listings or schedules (Document)
        09.04.03 Debtor (accounts receivable) listings or schedules (Document)
        09.04.04 Doubtful debt policy (Document)
        09.04.05 Other financial analysis, workings or reports (Document)

10 Human Resources (Main Folder)
    10.01 Policies and procedures (Folder)
        10.01.01 Code of conduct (Document)
        10.01.02 Contractor or consultant policy (Document)
        10.01.03 Employment and HR policies (Document)
    10.02 Employee registers (Folder)
        10.02.01 Bonus schedules (Document)
        10.02.02 Contractor or consultant register (Document)
        10.02.03 Payroll reports (Document)
        10.02.04 Staff register (Document)
        10.02.05 Staff remuneration schedule or summaries (Document)
    10.03 Employment agreements (Folder)
        10.03.01 Contractor or consultant agreement (Document)
        10.03.02 Standard employee agreements (Document)
        10.03.03 Enterprise agreements (collective bargaining agreements) (Document)
    10.04 Other HR information (Folder)
        10.04.01 Employee claims or disputes (Document)
        10.04.02 Employee related insurance arrangements (Document)
        10.04.03 Staff training (Document)
        10.04.04 Union correspondence (Document)
        10.04.05 Union membership details (Document)

11 Information Technology (Main Folder)
    11.01 IT design (Folder)
        11.01.01 IT network diagram (Document)
        11.01.02 Other documentation of system design or architecture (Document)
    11.02 IT registers (Folder)
        11.02.01 IT hardware inventory (Document)
        11.02.02 IT vendor list (Document)
    11.03 IT agreements (Folder)
        11.03.01 IT partner agreements (Document)
        11.03.02 IT warranty agreements (Document)
        11.03.03 Software agreements (Document)
        11.03.04 Software licenses (Document)

12 Intellectual Property (Main Folder)
    12.01 IP registers (Folder)
        12.01.01 Intellectual Property Schedule (Document)
    12.02 IP documentation (Folder)
        12.02.01 Domain name registrations (Document)
        12.02.02 ISO standard certifications (Document)
        12.02.03 Patents (Document)
        12.02.04 Trade mark registrations (Document)

13 Legal (Main Folder)
    13.01 Legal Policies (Folder)
        13.01.01 Confidentiality policies (Document)
        13.01.02 Conflict of interest policy (Document)
        13.01.03 Data protection policy (Document)
        13.01.04 Disclosure policies (Document)
        13.01.05 Security policy (Document)
    13.02 Legal certificates and licences (Folder)
        13.02.01 Accreditation certificates (Document)
        13.02.02 Business licences, regulatory approvals or registrations (Document)
        13.02.03 Compliance certificates (Document)
    13.03 Legal registers (Folder)
        13.03.01 Breach register (Document)
        13.03.02 Litigation register (Document)
    13.04 Legal reports (Folder)
        13.04.01 Compliance reports (Document)
        13.04.02 Sustainability reports (Document)

14 Tax (Main Folder)
    14.01 Correspondence with tax authorities (Folder)
        14.01.01 Notices and assessments from tax authorities (Document)
        14.01.02 Other correspondence with tax authorities (Document)
    14.02 Tax documentation (Folder)
        14.02.01 Tax returns (Document)
        14.02.02 Tax sharing or funding agreement (or deed) (Document)
    14.03 Tax calculation (Folder)
        14.03.01 Tax calculation workings (Document)
        14.03.02 Tax depreciation (fixed asset) schedule or register (Document)
        14.03.03 Other Government rates and changes (Document)
        14.03.04 Tax concessions (Document)

15 Transaction Documents (Main Folder)
    15.01 Due diligence materials (Folder)
        15.01.01 Information Memorandum (prepared for this transaction) (Document)
        15.01.02 Management Presentation (prepared for this transaction) (Document)
        15.01.03 Trading updates (prepared for this transaction) (Document)
        15.01.04 Vendor Due Diligence Reports (prepared for this transaction) (Document)
    15.02 Rules, agreements and checklists (Folder)
        15.02.01 Confidentiality Agreement or Deed (related to this transaction) - also known as a Non-disclosure Agreement (Document)
        15.02.02 Dataroom protocol or rules (Document)
        15.02.03 Due diligence requests or checklist (Document)
`;

export const schemaTemplates: SchemaTemplate[] = [
  {
    id: 'default',
    name: 'Default Structure',
    description: 'Basic folder structure with Documents and Images',
    tree: [
      {
        id: '1',
        name: 'Root',
        type: 'folder',
        children: [
          {
            id: '2',
            name: 'Documents',
            type: 'folder',
            children: [
              {
                id: '3',
                name: 'Reports',
                type: 'folder',
                children: [
                  {
                    id: '4',
                    name: 'Q1_Report.pdf',
                    type: 'file'
                  },
                  {
                    id: '5',
                    name: 'Q2_Report.pdf',
                    type: 'file'
                  }
                ]
              },
              {
                id: '6',
                name: 'Proposals',
                type: 'folder',
                children: [
                  {
                    id: '7',
                    name: 'Project_A.docx',
                    type: 'file'
                  }
                ]
              }
            ]
          },
          {
            id: '8',
            name: 'Images',
            type: 'folder',
            children: [
              {
                id: '9',
                name: 'Screenshots',
                type: 'folder',
                children: [
                  {
                    id: '10',
                    name: 'homepage.png',
                    type: 'file'
                  }
                ]
              }
            ]
          },
          {
            id: '11',
            name: 'README.md',
            type: 'file'
          }
        ]
      }
    ]
  },
  {
    id: 'Standard',
    name: 'Industry Standard Structure',
    description: '',
    tree: convertTextToTree(ansaradaStructure)
  }
]; 