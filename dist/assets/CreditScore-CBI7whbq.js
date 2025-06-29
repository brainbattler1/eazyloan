import{u as z,s as h,j as e}from"./index-DjnEXITF.js";import{r as i}from"./router-MjQpq3_0.js";import"./vendor-CSSWAZE4.js";import"./supabase-mDnqn92m.js";const O=({onClose:c})=>{const{user:t}=z(),[a,d]=i.useState(null),[k,x]=i.useState(!0),[u,n]=i.useState(null),[b,j]=i.useState(!1);i.useEffect(()=>{t&&v()},[t]);const v=async()=>{try{x(!0),n(null);const{data:r,error:s}=await h.rpc("get_current_credit_score",{check_user_id:t.id});if(s){console.warn("No existing credit score found, calculating new one:",s.message),await f();return}r&&r.length>0?d(r[0]):(console.log("No credit score found, calculating new one"),await f())}catch(r){console.error("Error fetching credit score:",r),n("Failed to load credit score. Please try again.")}finally{x(!1)}},f=async()=>{try{const{data:r,error:s}=await h.rpc("calculate_credit_score",{check_user_id:t.id});if(s){console.error("Error calculating credit score:",s);const g=650,E=y(g),S={score:g,score_band:E,calculated_at:new Date().toISOString(),factors:l(g),recommendations:m(g)};d(S);return}const o=r||650,p=y(o),{data:D,error:w}=await h.from("credit_scores").insert([{user_id:t.id,score:o,score_band:p,factors:l(o),recommendations:m(o),bureau_source:"internal",is_current:!0}]).select().single();if(w){console.error("Error inserting credit score:",w),d({score:o,score_band:p,calculated_at:new Date().toISOString(),factors:l(o),recommendations:m(o)});return}d({score:o,score_band:p,calculated_at:new Date().toISOString(),factors:l(o),recommendations:m(o)})}catch(r){console.error("Error calculating credit score:",r),n("Failed to calculate credit score. Please try again.")}},_=async()=>{j(!0),n(null);try{await h.from("credit_scores").update({is_current:!1}).eq("user_id",t.id).eq("is_current",!0),await f()}catch(r){console.error("Error refreshing credit score:",r),n("Failed to refresh credit score. Please try again.")}finally{j(!1)}},y=r=>r>=800?"excellent":r>=740?"very_good":r>=670?"good":r>=580?"fair":"poor",N=r=>{switch(r){case"excellent":return"#10b981";case"very_good":return"#22c55e";case"good":return"#3b82f6";case"fair":return"#f59e0b";case"poor":return"#ef4444";default:return"#6b7280"}},C=r=>{switch(r){case"excellent":return"Excellent";case"very_good":return"Very Good";case"good":return"Good";case"fair":return"Fair";case"poor":return"Poor";default:return"Unknown"}},l=r=>{const s={payment_history:Math.min(100,r/8.5+Math.random()*10),credit_utilization:Math.max(0,100-(r-300)/5.5+Math.random()*20),length_of_history:Math.min(100,(r-300)/5.5+Math.random()*15),credit_mix:Math.min(100,r/8.5+Math.random()*15),new_credit:Math.min(100,r/8.5+Math.random()*10)};return Object.keys(s).forEach(o=>{s[o]=Math.round(s[o])}),s},m=r=>{const s=[];return r<650&&s.push({title:"Improve Payment History",description:"Make all loan payments on time to build a positive payment history",impact:"High",timeframe:"3-6 months"}),r<700&&s.push({title:"Build Credit History",description:"Maintain active loan accounts to demonstrate responsible credit management",impact:"Medium",timeframe:"6-12 months"}),r<750&&s.push({title:"Diversify Credit Types",description:"Consider different types of loans to show you can manage various credit products",impact:"Medium",timeframe:"12+ months"}),s.push({title:"Monitor Your Score",description:"Check your credit score regularly to track improvements and catch any issues early",impact:"Low",timeframe:"Ongoing"}),s},M=r=>(r-300)/550*100;return k?e.jsx("div",{className:"modal-overlay",children:e.jsx("div",{className:"modal-content",children:e.jsxs("div",{className:"loading-center",children:[e.jsx("div",{className:"loading-spinner"}),e.jsx("p",{children:"Calculating your credit score..."})]})})}):u?e.jsx("div",{className:"modal-overlay",onClick:c,children:e.jsxs("div",{className:"credit-score-modal",onClick:r=>r.stopPropagation(),children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("h2",{children:"📈 Credit Score"}),e.jsx("button",{className:"close-btn",onClick:c,children:"✕"})]}),e.jsxs("div",{className:"error-state",children:[e.jsx("div",{className:"error-icon",children:"⚠️"}),e.jsx("h3",{children:"Unable to Load Credit Score"}),e.jsx("p",{children:u}),e.jsx("button",{className:"retry-btn",onClick:v,children:"Try Again"})]})]})}):e.jsx("div",{className:"modal-overlay",onClick:c,children:e.jsxs("div",{className:"credit-score-modal",onClick:r=>r.stopPropagation(),children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("h2",{children:"📈 Credit Score"}),e.jsx("button",{className:"close-btn",onClick:c,children:"✕"})]}),e.jsxs("div",{className:"credit-score-content",children:[e.jsxs("div",{className:"score-display",children:[e.jsx("div",{className:"score-circle",children:e.jsxs("div",{className:"score-progress",children:[e.jsxs("svg",{viewBox:"0 0 100 100",className:"score-svg",children:[e.jsx("circle",{cx:"50",cy:"50",r:"45",fill:"none",stroke:"#e5e7eb",strokeWidth:"8"}),e.jsx("circle",{cx:"50",cy:"50",r:"45",fill:"none",stroke:N(a==null?void 0:a.score_band),strokeWidth:"8",strokeLinecap:"round",strokeDasharray:`${M(a==null?void 0:a.score)*2.83} 283`,transform:"rotate(-90 50 50)",className:"score-progress-bar"})]}),e.jsxs("div",{className:"score-text",children:[e.jsx("div",{className:"score-number",children:a==null?void 0:a.score}),e.jsx("div",{className:"score-range",children:"300-850"})]})]})}),e.jsxs("div",{className:"score-info",children:[e.jsx("div",{className:"score-band",style:{color:N(a==null?void 0:a.score_band)},children:C(a==null?void 0:a.score_band)}),e.jsxs("div",{className:"score-date",children:["Last updated: ",new Date(a==null?void 0:a.calculated_at).toLocaleDateString()]}),e.jsx("button",{className:"refresh-btn",onClick:_,disabled:b,children:b?"🔄 Updating...":"🔄 Refresh Score"})]})]}),e.jsxs("div",{className:"score-factors",children:[e.jsx("h3",{children:"📊 Score Factors"}),e.jsx("div",{className:"factors-grid",children:(a==null?void 0:a.factors)&&Object.entries(a.factors).map(([r,s])=>e.jsxs("div",{className:"factor-item",children:[e.jsxs("div",{className:"factor-header",children:[e.jsx("span",{className:"factor-name",children:r.replace("_"," ").replace(/\b\w/g,o=>o.toUpperCase())}),e.jsxs("span",{className:"factor-value",children:[Math.round(s),"%"]})]}),e.jsx("div",{className:"factor-bar",children:e.jsx("div",{className:"factor-progress",style:{width:`${s}%`,backgroundColor:s>=80?"#10b981":s>=60?"#f59e0b":"#ef4444"}})})]},r))})]}),e.jsxs("div",{className:"recommendations",children:[e.jsx("h3",{children:"💡 Recommendations"}),e.jsx("div",{className:"recommendations-list",children:(a==null?void 0:a.recommendations)&&a.recommendations.map((r,s)=>{var o;return e.jsxs("div",{className:"recommendation-item",children:[e.jsxs("div",{className:"recommendation-header",children:[e.jsx("h4",{children:r.title}),e.jsxs("span",{className:`impact-badge impact-${(o=r.impact)==null?void 0:o.toLowerCase()}`,children:[r.impact," Impact"]})]}),e.jsx("p",{children:r.description}),e.jsxs("div",{className:"recommendation-timeframe",children:["⏱️ Expected timeframe: ",r.timeframe]})]},s)})})]}),e.jsxs("div",{className:"score-ranges",children:[e.jsx("h3",{children:"📋 Credit Score Ranges"}),e.jsxs("div",{className:"ranges-list",children:[e.jsxs("div",{className:"range-item",children:[e.jsx("div",{className:"range-color",style:{backgroundColor:"#ef4444"}}),e.jsxs("div",{className:"range-info",children:[e.jsx("span",{className:"range-label",children:"Poor"}),e.jsx("span",{className:"range-values",children:"300-579"})]})]}),e.jsxs("div",{className:"range-item",children:[e.jsx("div",{className:"range-color",style:{backgroundColor:"#f59e0b"}}),e.jsxs("div",{className:"range-info",children:[e.jsx("span",{className:"range-label",children:"Fair"}),e.jsx("span",{className:"range-values",children:"580-669"})]})]}),e.jsxs("div",{className:"range-item",children:[e.jsx("div",{className:"range-color",style:{backgroundColor:"#3b82f6"}}),e.jsxs("div",{className:"range-info",children:[e.jsx("span",{className:"range-label",children:"Good"}),e.jsx("span",{className:"range-values",children:"670-739"})]})]}),e.jsxs("div",{className:"range-item",children:[e.jsx("div",{className:"range-color",style:{backgroundColor:"#22c55e"}}),e.jsxs("div",{className:"range-info",children:[e.jsx("span",{className:"range-label",children:"Very Good"}),e.jsx("span",{className:"range-values",children:"740-799"})]})]}),e.jsxs("div",{className:"range-item",children:[e.jsx("div",{className:"range-color",style:{backgroundColor:"#10b981"}}),e.jsxs("div",{className:"range-info",children:[e.jsx("span",{className:"range-label",children:"Excellent"}),e.jsx("span",{className:"range-values",children:"800-850"})]})]})]})]})]}),e.jsx("style",{children:`
          .credit-score-modal {
            background: white;
            border-radius: 24px;
            max-width: 800px;
            width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
            border: 1px solid #e2e8f0;
          }

          .credit-score-content {
            padding: 2rem;
          }

          .score-display {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 3rem;
            margin-bottom: 3rem;
            padding: 2rem;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 20px;
            border: 1px solid #bae6fd;
          }

          .score-circle {
            position: relative;
          }

          .score-progress {
            position: relative;
            width: 200px;
            height: 200px;
          }

          .score-svg {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
          }

          .score-progress-bar {
            transition: stroke-dasharray 1s ease-in-out;
          }

          .score-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
          }

          .score-number {
            font-size: 3rem;
            font-weight: 800;
            color: #1e293b;
            line-height: 1;
          }

          .score-range {
            font-size: 0.875rem;
            color: #64748b;
            font-weight: 600;
          }

          .score-info {
            text-align: center;
          }

          .score-band {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
          }

          .score-date {
            font-size: 0.875rem;
            color: #64748b;
            margin-bottom: 1.5rem;
          }

          .refresh-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.875rem;
          }

          .refresh-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          }

          .refresh-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .score-factors {
            margin-bottom: 3rem;
          }

          .score-factors h3 {
            color: #374151;
            margin-bottom: 1.5rem;
            font-size: 1.25rem;
          }

          .factors-grid {
            display: grid;
            gap: 1rem;
          }

          .factor-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
          }

          .factor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
          }

          .factor-name {
            font-weight: 600;
            color: #374151;
          }

          .factor-value {
            font-weight: 700;
            color: #1e293b;
          }

          .factor-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
          }

          .factor-progress {
            height: 100%;
            border-radius: 4px;
            transition: width 1s ease-in-out;
          }

          .recommendations {
            margin-bottom: 3rem;
          }

          .recommendations h3 {
            color: #374151;
            margin-bottom: 1.5rem;
            font-size: 1.25rem;
          }

          .recommendations-list {
            display: grid;
            gap: 1rem;
          }

          .recommendation-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
          }

          .recommendation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
          }

          .recommendation-header h4 {
            color: #374151;
            font-size: 1rem;
            margin: 0;
          }

          .impact-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .impact-high {
            background: #fee2e2;
            color: #991b1b;
          }

          .impact-medium {
            background: #fef3c7;
            color: #92400e;
          }

          .impact-low {
            background: #d1fae5;
            color: #065f46;
          }

          .recommendation-item p {
            color: #64748b;
            margin-bottom: 1rem;
            line-height: 1.6;
          }

          .recommendation-timeframe {
            font-size: 0.875rem;
            color: #64748b;
            font-weight: 600;
          }

          .score-ranges h3 {
            color: #374151;
            margin-bottom: 1.5rem;
            font-size: 1.25rem;
          }

          .ranges-list {
            display: grid;
            gap: 0.75rem;
          }

          .range-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }

          .range-color {
            width: 16px;
            height: 16px;
            border-radius: 50%;
          }

          .range-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex: 1;
          }

          .range-label {
            font-weight: 600;
            color: #374151;
          }

          .range-values {
            font-weight: 600;
            color: #64748b;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          }

          .error-state {
            text-align: center;
            padding: 3rem;
          }

          .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }

          .error-state h3 {
            color: #374151;
            margin-bottom: 1rem;
          }

          .error-state p {
            color: #6b7280;
            margin-bottom: 2rem;
          }

          .retry-btn {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 1rem 2rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .retry-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
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
            .credit-score-modal {
              width: 95vw;
              max-height: 95vh;
            }

            .credit-score-content {
              padding: 1rem;
            }

            .score-display {
              flex-direction: column;
              gap: 2rem;
            }

            .score-progress {
              width: 150px;
              height: 150px;
            }

            .score-number {
              font-size: 2.5rem;
            }

            .recommendation-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
            }
          }
        `})]})})};export{O as default};
//# sourceMappingURL=CreditScore-CBI7whbq.js.map
