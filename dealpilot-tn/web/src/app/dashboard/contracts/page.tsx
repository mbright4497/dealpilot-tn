export default function ContractsPage(){
  return (<div>
    <div className="dp-page-header">
      <h1 className="dp-page-title">RF401 Quick Reference</h1>
      <span className="dp-badge dp-badge-active">2025 Forms</span>
    </div>
    <p style={{color:'var(--muted)',marginBottom:'1.5rem',fontSize:'0.875rem'}}>
      Tennessee Purchase &amp; Sale Agreement guide for residential properties (4 doors or less).
    </p>

    <div className="dp-guide-section">
      <h3>Section 1: Property &amp; Parties (Lines 3-9)</h3>
      <ul style={{color:'var(--foreground)',fontSize:'0.875rem',lineHeight:1.8,paddingLeft:'1.25rem'}}>
        <li>Buyer and Seller full legal names (Lines 3-4)</li>
        <li>Property address, city, zip (TN pre-printed)</li>
        <li>County where property is registered (Line 8)</li>
        <li>Deed book/page, instrument number (Line 9)</li>
      </ul>
    </div>

    <div className="dp-guide-section">
      <h3>Section 1A: Items That Convey (Stay with Property)</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',fontSize:'0.8rem',color:'var(--foreground)'}}>
        {['Light fixtures + bulbs','Plate glass mirrors','HVAC equipment','Doors, storm doors, windows','Window treatments (blinds, curtains, rods)','Wall-to-wall carpet','Range/stove (pre-written)','Built-in kitchen appliances','Bathroom fixtures + mirrors','Gas logs + fireplace remotes','EV charging stations','Swimming pools + equipment','Landscaping + outdoor lighting','Mailboxes','TV mounting brackets (not TV)','Antennas/satellite dishes','Central vac + attachments','All available keys + fobs','Access codes + master codes'].map((item,i) =>
          <div key={i} style={{padding:'0.375rem 0.625rem',background:'rgba(59,130,246,0.06)',borderRadius:6}}>{item}</div>
        )}
      </div>
    </div>

    <div className="dp-guide-section">
      <h3>Sections B, C, D: Additional Items</h3>
      <ul style={{color:'var(--foreground)',fontSize:'0.875rem',lineHeight:1.8,paddingLeft:'1.25rem'}}>
        <li><strong>B - Other items to stay:</strong> Refrigerator, washer/dryer (negotiated). No personal property here.</li>
        <li><strong>C - Items NOT staying:</strong> Seller discloses exclusions here.</li>
        <li><strong>D - Lease items:</strong> Security systems, water softeners, fuel tanks. Buyer checks box on Line 33 to decline.</li>
      </ul>
    </div>

    <div className="dp-guide-section">
      <h3>Section 2: Purchase Price &amp; Financing</h3>
      <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
        <div className="dp-guide-timeline">
          <span className="dp-timeline-badge">LOAN (A)</span>
          <span>LTV = loan amount / property value. Types: Conventional, VA, FHA, USDA. NOT cash, NOT THDA.</span>
        </div>
        <div className="dp-guide-timeline">
          <span className="dp-timeline-badge">CASH (B)</span>
          <span>Financial contingency waived. Proof of funds required within 5 days. Buyer can still get a loan but cannot terminate for denial.</span>
        </div>
      </div>
    </div>

    <div className="dp-guide-section">
      <h3>Buyer Performance Deadlines</h3>
      <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
        <div className="dp-guide-timeline">
          <span className="dp-timeline-badge">3 DAYS</span>
          <span>Full loan application + credit report + lender info to seller (RF656)</span>
        </div>
        <div className="dp-guide-timeline">
          <span className="dp-timeline-badge">14 DAYS</span>
          <span>Homeowner&apos;s insurance in place, intent to proceed with funds available, appraisal ordered (RF656 box 9)</span>
        </div>
        <div className="dp-guide-timeline">
          <span className="dp-timeline-badge">5 DAYS</span>
          <span>Cash buyers: proof of funds + appraiser info to seller</span>
        </div>
        <div className="dp-guide-timeline">
          <span className="dp-timeline-badge">2 DAYS</span>
          <span>Cure period after seller demand. Non-compliance = default = earnest money to seller.</span>
        </div>
      </div>
    </div>

    <div className="dp-guide-section">
      <h3>Buyer Obligations (Lines 63-84)</h3>
      <ul style={{color:'var(--foreground)',fontSize:'0.875rem',lineHeight:1.8,paddingLeft:'1.25rem'}}>
        <li>Pursue loan diligently and in good faith</li>
        <li>Immediately provide requested docs to lender</li>
        <li>Loan NOT contingent on lease or sale of other property (unless RF623)</li>
        <li>Do NOT make material financial changes (no quitting job, no new debt, no car purchases)</li>
      </ul>
    </div>

    <div className="dp-guide-section">
      <h3>Appraisal Contingency</h3>
      <ul style={{color:'var(--foreground)',fontSize:'0.875rem',lineHeight:1.8,paddingLeft:'1.25rem'}}>
        <li>Meets value, no repairs = proceed to closing</li>
        <li>Meets value + repairs = safety/security fixes only (not like home inspection)</li>
        <li>Does NOT meet value = buyer notifies seller, 3 days to decide</li>
        <li>VA loans: Tidewater process (48 hrs to submit comparable grid)</li>
        <li>Options: waive contingency (pay cash difference) or terminate (earnest money refunded per Line 112)</li>
      </ul>
    </div>

    <div className="dp-guide-section">
      <h3>Related Forms</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',fontSize:'0.8rem',color:'var(--foreground)'}}>
        <div style={{padding:'0.5rem 0.75rem',background:'rgba(139,92,246,0.08)',borderRadius:8}}><strong>RF656</strong> - Notification form (all deadlines)</div>
        <div style={{padding:'0.5rem 0.75rem',background:'rgba(139,92,246,0.08)',borderRadius:8}}><strong>RF623</strong> - First Right of Refusal (sale contingency)</div>
      </div>
    </div>
  </div>);
}
