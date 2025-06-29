import{u as M,s as p,j as e}from"./index-DjnEXITF.js";import{r as i}from"./router-MjQpq3_0.js";import"./vendor-CSSWAZE4.js";import"./supabase-mDnqn92m.js";const L=({onClose:x})=>{const{user:d}=M(),[n,c]=i.useState({loanAmount:"",interestRate:"12",termMonths:"12",loanPurpose:"personal"}),[t,b]=i.useState(null),[f,C]=i.useState([]),[g,v]=i.useState(!1),[_,u]=i.useState(!1),[l,o]=i.useState("calculator");i.useEffect(()=>{d&&l==="saved"&&j()},[d,l]);const j=async()=>{try{const{data:a,error:s}=await p.from("loan_calculations").select("*").eq("user_id",d.id).eq("saved",!0).order("created_at",{ascending:!1});if(s)throw s;C(a||[])}catch(a){console.error("Error fetching saved calculations:",a)}},A=async()=>{if(!n.loanAmount||!n.interestRate||!n.termMonths){alert("Please fill in all required fields");return}try{v(!0);const{data:a,error:s}=await p.rpc("calculate_loan_payment",{principal:parseFloat(n.loanAmount),annual_rate:parseFloat(n.interestRate),term_months:parseInt(n.termMonths)});if(s)throw s;const m=a[0];b({loanAmount:parseFloat(n.loanAmount),interestRate:parseFloat(n.interestRate),termMonths:parseInt(n.termMonths),monthlyPayment:m.monthly_payment,totalInterest:m.total_interest,totalAmount:m.total_amount,loanPurpose:n.loanPurpose})}catch(a){console.error("Error calculating loan:",a),alert("Error calculating loan: "+a.message)}finally{v(!1)}},P=async()=>{if(!(!t||!d))try{const{error:a}=await p.from("loan_calculations").insert([{user_id:d.id,loan_amount:t.loanAmount,interest_rate:t.interestRate,term_months:t.termMonths,monthly_payment:t.monthlyPayment,total_interest:t.totalInterest,total_amount:t.totalAmount,loan_purpose:t.loanPurpose,saved:!0,notes:`Calculation for ${r(t.loanAmount)} loan`}]);if(a)throw a;u(!0),setTimeout(()=>{u(!1)},5e3),l==="saved"&&j()}catch(a){console.error("Error saving calculation:",a),alert("Error saving calculation: "+a.message)}},r=a=>new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",minimumFractionDigits:0}).format(a||0),y=a=>`${a}%`,S=()=>{if(!t)return[];const a=[];let s=t.loanAmount;const m=t.interestRate/100/12,w=t.monthlyPayment;for(let h=1;h<=t.termMonths;h++){const N=s*m,k=w-N;s-=k,a.push({month:h,payment:w,principal:k,interest:N,balance:Math.max(0,s)})}return a},z=()=>{if(!t)return null;const a=t.monthlyPayment;return a<=5e3?{level:"excellent",color:"#10b981",title:"Excellent Affordability",description:"This loan payment fits comfortably within most budgets."}:a<=15e3?{level:"good",color:"#3b82f6",title:"Good Affordability",description:"This payment is manageable for most middle-income earners."}:a<=3e4?{level:"moderate",color:"#f59e0b",title:"Moderate Affordability",description:"Ensure this payment fits within your monthly budget."}:{level:"challenging",color:"#ef4444",title:"Challenging Affordability",description:"Consider a longer term or smaller amount to reduce payments."}};return e.jsx("div",{className:"modal-overlay",onClick:x,children:e.jsxs("div",{className:"calculator-modal",onClick:a=>a.stopPropagation(),children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("h2",{children:"🎯 Loan Calculator"}),e.jsx("button",{className:"close-btn",onClick:x,children:"✕"})]}),_&&e.jsxs("div",{className:"success-message",children:[e.jsx("div",{className:"success-icon",children:"✅"}),e.jsxs("div",{className:"success-content",children:[e.jsx("h4",{children:"Calculation Saved!"}),e.jsx("p",{children:"Your loan calculation has been saved successfully"})]}),e.jsx("button",{className:"close-success-btn",onClick:()=>u(!1),children:"✕"})]}),e.jsxs("div",{className:"calculator-tabs",children:[e.jsx("button",{className:`tab ${l==="calculator"?"active":""}`,onClick:()=>o("calculator"),children:"🧮 Calculator"}),e.jsx("button",{className:`tab ${l==="results"?"active":""}`,onClick:()=>o("results"),disabled:!t,children:"📊 Results"}),e.jsx("button",{className:`tab ${l==="saved"?"active":""}`,onClick:()=>o("saved"),children:"💾 Saved"})]}),e.jsxs("div",{className:"tab-content",children:[l==="calculator"&&e.jsxs("div",{className:"calculator-tab",children:[e.jsxs("div",{className:"calculator-form",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Loan Amount (KES)"}),e.jsx("input",{type:"number",value:n.loanAmount,onChange:a=>c(s=>({...s,loanAmount:a.target.value})),placeholder:"100,000",min:"1000",step:"1000"})]}),e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Interest Rate (%)"}),e.jsx("input",{type:"number",value:n.interestRate,onChange:a=>c(s=>({...s,interestRate:a.target.value})),placeholder:"12",min:"1",max:"50",step:"0.1"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Term (Months)"}),e.jsxs("select",{value:n.termMonths,onChange:a=>c(s=>({...s,termMonths:a.target.value})),children:[e.jsx("option",{value:"3",children:"3 months"}),e.jsx("option",{value:"6",children:"6 months"}),e.jsx("option",{value:"12",children:"12 months"}),e.jsx("option",{value:"18",children:"18 months"}),e.jsx("option",{value:"24",children:"24 months"}),e.jsx("option",{value:"36",children:"36 months"}),e.jsx("option",{value:"48",children:"48 months"}),e.jsx("option",{value:"60",children:"60 months"})]})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Loan Purpose"}),e.jsxs("select",{value:n.loanPurpose,onChange:a=>c(s=>({...s,loanPurpose:a.target.value})),children:[e.jsx("option",{value:"personal",children:"Personal"}),e.jsx("option",{value:"business",children:"Business"}),e.jsx("option",{value:"education",children:"Education"}),e.jsx("option",{value:"medical",children:"Medical"}),e.jsx("option",{value:"home_improvement",children:"Home Improvement"}),e.jsx("option",{value:"debt_consolidation",children:"Debt Consolidation"}),e.jsx("option",{value:"emergency",children:"Emergency"})]})]}),e.jsx("button",{className:"calculate-btn",onClick:A,disabled:g,children:g?"Calculating...":"🧮 Calculate Loan"})]}),t&&e.jsxs("div",{className:"quick-results",children:[e.jsx("h3",{children:"Quick Results"}),e.jsxs("div",{className:"results-grid",children:[e.jsxs("div",{className:"result-item",children:[e.jsx("div",{className:"result-label",children:"Monthly Payment"}),e.jsx("div",{className:"result-value",children:r(t.monthlyPayment)})]}),e.jsxs("div",{className:"result-item",children:[e.jsx("div",{className:"result-label",children:"Total Interest"}),e.jsx("div",{className:"result-value",children:r(t.totalInterest)})]}),e.jsxs("div",{className:"result-item",children:[e.jsx("div",{className:"result-label",children:"Total Amount"}),e.jsx("div",{className:"result-value",children:r(t.totalAmount)})]})]}),e.jsx("button",{className:"view-details-btn",onClick:()=>o("results"),children:"View Detailed Results"})]})]}),l==="results"&&t&&e.jsxs("div",{className:"results-tab",children:[e.jsxs("div",{className:"results-summary",children:[e.jsx("h3",{children:"Loan Summary"}),e.jsxs("div",{className:"summary-grid",children:[e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Loan Amount"}),e.jsx("div",{className:"summary-value",children:r(t.loanAmount)})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Interest Rate"}),e.jsx("div",{className:"summary-value",children:y(t.interestRate)})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Term"}),e.jsxs("div",{className:"summary-value",children:[t.termMonths," months"]})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Monthly Payment"}),e.jsx("div",{className:"summary-value primary",children:r(t.monthlyPayment)})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Total Interest"}),e.jsx("div",{className:"summary-value",children:r(t.totalInterest)})]}),e.jsxs("div",{className:"summary-item",children:[e.jsx("div",{className:"summary-label",children:"Total Amount"}),e.jsx("div",{className:"summary-value",children:r(t.totalAmount)})]})]})]}),(()=>{const a=z();return a?e.jsxs("div",{className:"affordability-card",style:{borderColor:a.color},children:[e.jsx("div",{className:"affordability-header",children:e.jsx("h4",{style:{color:a.color},children:a.title})}),e.jsx("p",{children:a.description})]}):null})(),e.jsxs("div",{className:"payment-breakdown",children:[e.jsx("h4",{children:"Payment Breakdown"}),e.jsxs("div",{className:"breakdown-chart",children:[e.jsxs("div",{className:"chart-bar",children:[e.jsx("div",{className:"principal-portion",style:{width:`${t.loanAmount/t.totalAmount*100}%`},children:"Principal"}),e.jsx("div",{className:"interest-portion",style:{width:`${t.totalInterest/t.totalAmount*100}%`},children:"Interest"})]}),e.jsxs("div",{className:"chart-legend",children:[e.jsxs("div",{className:"legend-item",children:[e.jsx("div",{className:"legend-color principal"}),e.jsxs("span",{children:["Principal: ",r(t.loanAmount)]})]}),e.jsxs("div",{className:"legend-item",children:[e.jsx("div",{className:"legend-color interest"}),e.jsxs("span",{children:["Interest: ",r(t.totalInterest)]})]})]})]})]}),e.jsxs("div",{className:"amortization-schedule",children:[e.jsx("h4",{children:"Payment Schedule (First 12 Months)"}),e.jsxs("div",{className:"schedule-table",children:[e.jsxs("div",{className:"schedule-header",children:[e.jsx("div",{children:"Month"}),e.jsx("div",{children:"Payment"}),e.jsx("div",{children:"Principal"}),e.jsx("div",{children:"Interest"}),e.jsx("div",{children:"Balance"})]}),S().slice(0,12).map(a=>e.jsxs("div",{className:"schedule-row",children:[e.jsx("div",{children:a.month}),e.jsx("div",{children:r(a.payment)}),e.jsx("div",{children:r(a.principal)}),e.jsx("div",{children:r(a.interest)}),e.jsx("div",{children:r(a.balance)})]},a.month))]})]}),e.jsxs("div",{className:"results-actions",children:[e.jsx("button",{className:"save-btn",onClick:P,children:"💾 Save Calculation"}),e.jsx("button",{className:"new-calc-btn",onClick:()=>o("calculator"),children:"🧮 New Calculation"})]})]}),l==="saved"&&e.jsxs("div",{className:"saved-tab",children:[e.jsxs("div",{className:"saved-header",children:[e.jsx("h3",{children:"💾 Saved Calculations"}),e.jsx("p",{children:"Your previously saved loan calculations"})]}),f.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("div",{className:"empty-icon",children:"💾"}),e.jsx("h3",{children:"No Saved Calculations"}),e.jsx("p",{children:"Save your loan calculations to compare different scenarios."}),e.jsx("button",{className:"new-calc-btn",onClick:()=>o("calculator"),children:"🧮 Start Calculating"})]}):e.jsx("div",{className:"saved-list",children:f.map(a=>e.jsxs("div",{className:"saved-item",children:[e.jsxs("div",{className:"saved-header",children:[e.jsxs("h4",{children:[r(a.loan_amount)," Loan"]}),e.jsx("span",{className:"saved-date",children:new Date(a.created_at).toLocaleDateString()})]}),e.jsxs("div",{className:"saved-details",children:[e.jsxs("div",{className:"detail-row",children:[e.jsx("span",{children:"Monthly Payment:"}),e.jsx("strong",{children:r(a.monthly_payment)})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("span",{children:"Term:"}),e.jsxs("span",{children:[a.term_months," months"]})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("span",{children:"Interest Rate:"}),e.jsx("span",{children:y(a.interest_rate)})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("span",{children:"Total Interest:"}),e.jsx("span",{children:r(a.total_interest)})]})]}),e.jsx("div",{className:"saved-actions",children:e.jsx("button",{className:"load-btn",onClick:()=>{c({loanAmount:a.loan_amount.toString(),interestRate:a.interest_rate.toString(),termMonths:a.term_months.toString(),loanPurpose:a.loan_purpose||"personal"}),b({loanAmount:a.loan_amount,interestRate:a.interest_rate,termMonths:a.term_months,monthlyPayment:a.monthly_payment,totalInterest:a.total_interest,totalAmount:a.total_amount,loanPurpose:a.loan_purpose}),o("results")},children:"📊 View Details"})})]},a.id))})]})]}),e.jsx("style",{children:`
          .calculator-modal {
            background: white;
            border-radius: 24px;
            max-width: 900px;
            width: 90vw;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
            border: 1px solid #e2e8f0;
          }

          .calculator-tabs {
            display: flex;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 0.5rem;
          }

          .tab {
            flex: 1;
            background: none;
            border: none;
            padding: 1rem;
            font-weight: 600;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s ease;
            border-radius: 12px;
            font-size: 0.9rem;
          }

          .tab:hover:not(:disabled) {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
          }

          .tab.active {
            background: white;
            color: #3b82f6;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }

          .tab:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .tab-content {
            padding: 2rem;
            max-height: 60vh;
            overflow-y: auto;
          }

          .calculator-form {
            max-width: 500px;
            margin: 0 auto;
          }

          .form-group {
            margin-bottom: 1.5rem;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }

          .form-group label {
            display: block;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 0.75rem;
            font-size: 0.95rem;
            letter-spacing: 0.025em;
          }

          .form-group input,
          .form-group select {
            width: 100%;
            padding: 1.25rem;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 500;
            color: #1f2937;
            background: #ffffff;
            transition: all 0.2s ease;
            min-height: 56px;
            box-sizing: border-box;
          }
          
          .form-group input::placeholder {
            color: #9ca3af;
            font-weight: 400;
            opacity: 0.8;
          }

          .form-group input:focus,
          .form-group select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
            background: #fefefe;
            color: #111827;
          }
          
          .form-group input:hover,
          .form-group select:hover {
            border-color: #6b7280;
            background: #fefefe;
          }

          .calculate-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 1rem 2rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 100%;
            font-size: 1rem;
            margin-bottom: 2rem;
          }

          .calculate-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          }

          .calculate-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .quick-results {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 1px solid #bae6fd;
            border-radius: 16px;
            padding: 2rem;
            text-align: center;
          }

          .quick-results h3 {
            color: #1e40af;
            margin-bottom: 1.5rem;
          }

          .results-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .result-item {
            background: white;
            border-radius: 12px;
            padding: 1rem;
            border: 1px solid #bae6fd;
          }

          .result-label {
            font-size: 0.875rem;
            color: #64748b;
            margin-bottom: 0.5rem;
            font-weight: 600;
          }

          .result-value {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1e40af;
          }

          .view-details-btn {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .view-details-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          }

          .results-summary {
            margin-bottom: 2rem;
          }

          .results-summary h3 {
            color: #374151;
            margin-bottom: 1.5rem;
            text-align: center;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-bottom: 2rem;
          }

          .summary-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
          }

          .summary-label {
            font-size: 0.875rem;
            color: #64748b;
            margin-bottom: 0.5rem;
            font-weight: 600;
          }

          .summary-value {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1e293b;
          }

          .summary-value.primary {
            color: #3b82f6;
            font-size: 1.5rem;
          }

          .affordability-card {
            background: #f8fafc;
            border: 2px solid;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
          }

          .affordability-header h4 {
            margin-bottom: 0.5rem;
            font-size: 1.125rem;
          }

          .affordability-card p {
            margin: 0;
            color: #64748b;
            line-height: 1.6;
          }

          .payment-breakdown {
            margin-bottom: 2rem;
          }

          .payment-breakdown h4 {
            color: #374151;
            margin-bottom: 1rem;
          }

          .breakdown-chart {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
          }

          .chart-bar {
            display: flex;
            height: 40px;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 1rem;
          }

          .principal-portion {
            background: #3b82f6;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.875rem;
          }

          .interest-portion {
            background: #f59e0b;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.875rem;
          }

          .chart-legend {
            display: flex;
            gap: 2rem;
            justify-content: center;
          }

          .legend-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: #64748b;
          }

          .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 4px;
          }

          .legend-color.principal {
            background: #3b82f6;
          }

          .legend-color.interest {
            background: #f59e0b;
          }

          .amortization-schedule {
            margin-bottom: 2rem;
          }

          .amortization-schedule h4 {
            color: #374151;
            margin-bottom: 1rem;
          }

          .schedule-table {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
          }

          .schedule-header {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            background: #e2e8f0;
            padding: 1rem;
            font-weight: 700;
            color: #374151;
            font-size: 0.875rem;
          }

          .schedule-row {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #e2e8f0;
            font-size: 0.875rem;
            color: #64748b;
          }

          .schedule-row:last-child {
            border-bottom: none;
          }

          .results-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }

          .save-btn,
          .new-calc-btn {
            padding: 1rem 2rem;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 1rem;
          }

          .save-btn {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
          }

          .new-calc-btn {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
          }

          .save-btn:hover,
          .new-calc-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          }

          .saved-header {
            text-align: center;
            margin-bottom: 2rem;
          }

          .saved-header h3 {
            color: #374151;
            margin-bottom: 0.5rem;
          }

          .saved-header p {
            color: #6b7280;
          }

          .empty-state {
            text-align: center;
            padding: 3rem 1rem;
          }

          .empty-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            opacity: 0.5;
          }

          .empty-state h3 {
            color: #374151;
            margin-bottom: 0.5rem;
          }

          .empty-state p {
            color: #6b7280;
            margin-bottom: 2rem;
          }

          .saved-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .saved-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
          }

          .saved-item .saved-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            text-align: left;
          }

          .saved-item h4 {
            color: #374151;
            margin: 0;
          }

          .saved-date {
            font-size: 0.875rem;
            color: #64748b;
          }

          .saved-details {
            display: grid;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }

          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.875rem;
          }

          .detail-row span:first-child {
            color: #64748b;
          }

          .detail-row strong {
            color: #3b82f6;
            font-weight: 700;
          }

          .saved-actions {
            display: flex;
            justify-content: flex-end;
          }

          .load-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 0.5rem 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.875rem;
          }

          .load-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }

          @media (max-width: 768px) {
            .calculator-modal {
              width: 95vw;
              max-height: 95vh;
            }

            .tab-content {
              padding: 1rem;
            }

            .form-row {
              grid-template-columns: 1fr;
            }

            .results-grid,
            .summary-grid {
              grid-template-columns: 1fr;
            }

            .chart-legend {
              flex-direction: column;
              align-items: center;
              gap: 1rem;
            }

            .schedule-header,
            .schedule-row {
              grid-template-columns: repeat(3, 1fr);
              font-size: 0.75rem;
            }

            .schedule-header div:nth-child(3),
            .schedule-header div:nth-child(4),
            .schedule-row div:nth-child(3),
            .schedule-row div:nth-child(4) {
              display: none;
            }

            .results-actions {
              flex-direction: column;
            }

            .saved-item .saved-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
            }
          }
        `})]})})};export{L as default};
//# sourceMappingURL=LoanCalculator-BFgbOfqw.js.map
