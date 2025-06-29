import{u as E,s as u,j as e}from"./index-DjnEXITF.js";import{r as i}from"./router-MjQpq3_0.js";import"./vendor-CSSWAZE4.js";import"./supabase-mDnqn92m.js";const T=({onClose:b})=>{const{user:o}=E(),[n,d]=i.useState("overview"),[f,N]=i.useState([]),[t,w]=i.useState(null),[g,k]=i.useState([]),[h,c]=i.useState(!0),[M,P]=i.useState(null),[r,l]=i.useState({amount:"",paymentMethod:"mpesa",mpesaNumber:"",notes:""});i.useEffect(()=>{o&&y()},[o]);const y=async()=>{try{c(!0);const{data:a,error:s}=await u.rpc("get_user_payment_summary",{check_user_id:o.id});if(s)throw s;w((a==null?void 0:a[0])||{});const{data:p,error:v}=await u.from("payments").select("*").eq("user_id",o.id).order("created_at",{ascending:!1});if(v)throw v;N(p||[]);const{data:S,error:j}=await u.from("payment_schedules").select("*").eq("user_id",o.id).eq("is_active",!0);if(j)throw j;k(S||[])}catch(a){console.error("Error fetching payment data:",a),P(a.message)}finally{c(!1)}},_=async a=>{a.preventDefault();try{c(!0);const{data:s,error:p}=await u.from("payments").insert([{user_id:o.id,amount:parseFloat(r.amount),payment_method:r.paymentMethod,status:"pending",notes:r.notes,metadata:{mpesa_number:r.mpesaNumber}}]).select().single();if(p)throw p;alert("Payment initiated successfully! You will receive an M-Pesa prompt shortly."),l({amount:"",paymentMethod:"mpesa",mpesaNumber:"",notes:""}),await y()}catch(s){console.error("Error making payment:",s),alert("Error initiating payment: "+s.message)}finally{c(!1)}},m=a=>new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",minimumFractionDigits:0}).format(a||0),x=a=>new Date(a).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}),C=a=>{switch(a){case"completed":return"✅";case"pending":return"⏳";case"failed":return"❌";case"cancelled":return"🚫";default:return"📄"}},z=a=>{switch(a){case"completed":return"#10b981";case"pending":return"#f59e0b";case"failed":return"#ef4444";case"cancelled":return"#6b7280";default:return"#6b7280"}};return h&&!t?e.jsx("div",{className:"modal-overlay",children:e.jsx("div",{className:"modal-content",children:e.jsxs("div",{className:"loading-center",children:[e.jsx("div",{className:"loading-spinner"}),e.jsx("p",{children:"Loading payment center..."})]})})}):e.jsxs("div",{className:"modal-overlay",onClick:b,children:[e.jsxs("div",{className:"payment-center-modal",onClick:a=>a.stopPropagation(),children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("h2",{children:"💳 Payment Center"}),e.jsx("button",{className:"close-btn",onClick:b,children:"✕"})]}),e.jsxs("div",{className:"payment-tabs",children:[e.jsx("button",{className:`tab ${n==="overview"?"active":""}`,onClick:()=>d("overview"),children:"📊 Overview"}),e.jsx("button",{className:`tab ${n==="make-payment"?"active":""}`,onClick:()=>d("make-payment"),children:"💰 Make Payment"}),e.jsx("button",{className:`tab ${n==="history"?"active":""}`,onClick:()=>d("history"),children:"📋 History"}),e.jsx("button",{className:`tab ${n==="schedule"?"active":""}`,onClick:()=>d("schedule"),children:"📅 Schedule"})]}),e.jsxs("div",{className:"tab-content",children:[n==="overview"&&e.jsxs("div",{className:"overview-tab",children:[e.jsxs("div",{className:"payment-summary-grid",children:[e.jsxs("div",{className:"summary-card",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("h3",{children:"Total Payments"}),e.jsx("span",{className:"card-icon",children:"💰"})]}),e.jsx("div",{className:"card-value",children:m(t==null?void 0:t.total_payments)}),e.jsx("div",{className:"card-subtitle",children:"All time payments"})]}),e.jsxs("div",{className:"summary-card",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("h3",{children:"Completed"}),e.jsx("span",{className:"card-icon",children:"✅"})]}),e.jsx("div",{className:"card-value",children:(t==null?void 0:t.completed_payments)||0}),e.jsx("div",{className:"card-subtitle",children:"Successful payments"})]}),e.jsxs("div",{className:"summary-card",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("h3",{children:"Pending"}),e.jsx("span",{className:"card-icon",children:"⏳"})]}),e.jsx("div",{className:"card-value",children:(t==null?void 0:t.pending_payments)||0}),e.jsx("div",{className:"card-subtitle",children:"Awaiting processing"})]}),e.jsxs("div",{className:"summary-card",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("h3",{children:"Overdue"}),e.jsx("span",{className:"card-icon",children:"⚠️"})]}),e.jsx("div",{className:"card-value",children:(t==null?void 0:t.overdue_payments)||0}),e.jsx("div",{className:"card-subtitle",children:"Past due date"})]})]}),(t==null?void 0:t.next_payment_date)&&e.jsxs("div",{className:"next-payment-card",children:[e.jsx("h3",{children:"📅 Next Payment Due"}),e.jsxs("div",{className:"next-payment-details",children:[e.jsx("div",{className:"payment-amount",children:m(t.next_payment_amount)}),e.jsxs("div",{className:"payment-date",children:["Due: ",x(t.next_payment_date)]})]}),e.jsx("button",{className:"pay-now-btn",onClick:()=>d("make-payment"),children:"Pay Now"})]})]}),n==="make-payment"&&e.jsxs("div",{className:"make-payment-tab",children:[e.jsxs("form",{onSubmit:_,className:"payment-form",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Payment Amount (KES)"}),e.jsx("input",{type:"number",value:r.amount,onChange:a=>l(s=>({...s,amount:a.target.value})),placeholder:"Enter amount",min:"1",step:"0.01",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Payment Method"}),e.jsxs("select",{value:r.paymentMethod,onChange:a=>l(s=>({...s,paymentMethod:a.target.value})),children:[e.jsx("option",{value:"mpesa",children:"M-Pesa"}),e.jsx("option",{value:"bank_transfer",children:"Bank Transfer"}),e.jsx("option",{value:"card",children:"Debit/Credit Card"})]})]}),r.paymentMethod==="mpesa"&&e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"M-Pesa Number"}),e.jsx("input",{type:"tel",value:r.mpesaNumber,onChange:a=>l(s=>({...s,mpesaNumber:a.target.value})),placeholder:"0712345678",pattern:"[0-9]{10}",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Notes (Optional)"}),e.jsx("textarea",{value:r.notes,onChange:a=>l(s=>({...s,notes:a.target.value})),placeholder:"Payment notes...",rows:"3"})]}),e.jsx("button",{type:"submit",className:"submit-payment-btn",disabled:h,children:h?"Processing...":"Make Payment"})]}),e.jsxs("div",{className:"payment-info",children:[e.jsx("h4",{children:"💡 Payment Information"}),e.jsxs("ul",{children:[e.jsx("li",{children:"M-Pesa payments are processed instantly"}),e.jsx("li",{children:"Bank transfers may take 1-2 business days"}),e.jsx("li",{children:"You'll receive a confirmation SMS/email"}),e.jsx("li",{children:"Contact support for payment issues"})]})]})]}),n==="history"&&e.jsx("div",{className:"history-tab",children:e.jsx("div",{className:"payments-list",children:f.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("div",{className:"empty-icon",children:"💳"}),e.jsx("h3",{children:"No Payment History"}),e.jsx("p",{children:"You haven't made any payments yet."})]}):f.map(a=>e.jsx("div",{className:"payment-item",children:e.jsxs("div",{className:"payment-info",children:[e.jsxs("div",{className:"payment-header",children:[e.jsxs("span",{className:"payment-status",style:{color:z(a.status)},children:[C(a.status)," ",a.status.toUpperCase()]}),e.jsx("span",{className:"payment-date",children:x(a.created_at)})]}),e.jsxs("div",{className:"payment-details",children:[e.jsx("div",{className:"payment-amount",children:m(a.amount)}),e.jsxs("div",{className:"payment-method",children:["via ",a.payment_method.replace("_"," ").toUpperCase()]})]}),a.notes&&e.jsx("div",{className:"payment-notes",children:a.notes})]})},a.id))})}),n==="schedule"&&e.jsxs("div",{className:"schedule-tab",children:[e.jsxs("div",{className:"schedule-info",children:[e.jsx("h3",{children:"📅 Payment Schedules"}),e.jsx("p",{children:"Set up automatic payments to never miss a due date."})]}),g.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("div",{className:"empty-icon",children:"📅"}),e.jsx("h3",{children:"No Payment Schedules"}),e.jsx("p",{children:"Set up automatic payments for convenience."}),e.jsx("button",{className:"setup-schedule-btn",children:"Set Up Auto-Pay"})]}):e.jsx("div",{className:"schedules-list",children:g.map(a=>e.jsxs("div",{className:"schedule-item",children:[e.jsxs("div",{className:"schedule-details",children:[e.jsxs("h4",{children:[m(a.amount)," - ",a.schedule_type]}),e.jsxs("p",{children:["Next payment: ",x(a.next_payment_date)]}),e.jsxs("p",{children:["Auto-debit: ",a.auto_debit?"Enabled":"Disabled"]})]}),e.jsxs("div",{className:"schedule-actions",children:[e.jsx("button",{className:"edit-schedule-btn",children:"Edit"}),e.jsx("button",{className:"pause-schedule-btn",children:"Pause"})]})]},a.id))})]})]})]}),e.jsx("style",{children:`
        .payment-center-modal {
          background: white;
          border-radius: 24px;
          max-width: 900px;
          width: 90vw;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
          border: 1px solid #e2e8f0;
        }

        .payment-tabs {
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

        .tab:hover {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .tab.active {
          background: white;
          color: #3b82f6;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .tab-content {
          padding: 2rem;
          max-height: 60vh;
          overflow-y: auto;
        }

        .payment-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .summary-card {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.5rem;
          transition: transform 0.2s ease;
        }

        .summary-card:hover {
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .card-header h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-icon {
          font-size: 1.5rem;
        }

        .card-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .card-subtitle {
          font-size: 0.875rem;
          color: #64748b;
        }

        .next-payment-card {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border: 1px solid #3b82f6;
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
        }

        .next-payment-card h3 {
          color: #1e40af;
          margin-bottom: 1rem;
        }

        .next-payment-details {
          margin-bottom: 1.5rem;
        }

        .payment-amount {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1e40af;
          margin-bottom: 0.5rem;
        }

        .payment-date {
          font-size: 1.125rem;
          color: #1e40af;
          font-weight: 600;
        }

        .pay-now-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 1rem;
        }

        .pay-now-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }

        .payment-form {
          max-width: 500px;
          margin: 0 auto;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.2s ease;
          background: white;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .submit-payment-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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

        .submit-payment-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }

        .submit-payment-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .payment-info {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .payment-info h4 {
          color: #1e40af;
          margin-bottom: 1rem;
        }

        .payment-info ul {
          color: #1e40af;
          margin: 0;
          padding-left: 1.5rem;
        }

        .payment-info li {
          margin-bottom: 0.5rem;
        }

        .payments-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .payment-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .payment-item:hover {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .payment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .payment-status {
          font-weight: 700;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .payment-date {
          font-size: 0.875rem;
          color: #64748b;
        }

        .payment-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .payment-amount {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }

        .payment-method {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 600;
        }

        .payment-notes {
          font-size: 0.875rem;
          color: #64748b;
          font-style: italic;
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

        .setup-schedule-btn {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .setup-schedule-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }

        .schedule-info {
          text-align: center;
          margin-bottom: 2rem;
        }

        .schedule-info h3 {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .schedule-info p {
          color: #6b7280;
        }

        .schedules-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .schedule-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .schedule-details h4 {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .schedule-details p {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0.25rem 0;
        }

        .schedule-actions {
          display: flex;
          gap: 0.5rem;
        }

        .edit-schedule-btn,
        .pause-schedule-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          color: #374151;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .edit-schedule-btn:hover {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .pause-schedule-btn:hover {
          background: #f59e0b;
          color: white;
          border-color: #f59e0b;
        }

        .loading-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .payment-center-modal {
            width: 95vw;
            max-height: 95vh;
          }

          .payment-summary-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .tab-content {
            padding: 1rem;
          }

          .payment-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .schedule-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .schedule-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `})]})};export{T as default};
//# sourceMappingURL=PaymentCenter-oL9umOUK.js.map
