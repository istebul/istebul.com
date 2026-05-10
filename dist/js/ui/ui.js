import{escapeHtml as b,safeImageUrl as f,safeUrl as H}from"../core/security.js";import{state as v}from"../core/state.js";export class UIManager{constructor(){this.notifications=[]}init(){this.setupTheme(),this.setupGlobalUI(),this.setupResponsiveNav(),this.setupKeyboardShortcuts()}setupTheme(){const e=localStorage.getItem("istebu_theme"),t=window.matchMedia?.("(prefers-color-scheme: dark)").matches,a=e||(t?"dark":"light");this.applyTheme(a);const s=document.getElementById("theme-toggle");s&&s.addEventListener("click",()=>{const i=document.documentElement.dataset.theme==="dark"?"light":"dark";localStorage.setItem("istebu_theme",i),this.applyTheme(i)})}applyTheme(e){const t=e==="dark"?"dark":"light";document.documentElement.dataset.theme=t,document.documentElement.style.colorScheme=t;const a=document.getElementById("theme-color-meta");a&&a.setAttribute("content",t==="dark"?"#0f172a":"#2563eb");const s=document.getElementById("theme-toggle");if(s){const i=t==="dark";s.setAttribute("aria-label",i?"Ayd\u0131nl\u0131k modu a\xE7":"Koyu modu a\xE7"),s.setAttribute("aria-pressed",String(i)),s.setAttribute("title",i?"Ayd\u0131nl\u0131k moda ge\xE7":"Koyu moda ge\xE7"),s.innerHTML=`
                <i data-lucide="${i?"sun":"moon"}"></i>
                <span class="sr-only">${i?"Ayd\u0131nl\u0131k modu a\xE7":"Koyu modu a\xE7"}</span>
            `,this.loadIcons()}}setupGlobalUI(){document.addEventListener("keydown",e=>{e.key==="Escape"&&this.closeAllModals()}),this.loadIcons()}setupResponsiveNav(){const e=document.getElementById("nav-menu"),t=document.getElementById("nav-auth"),a=document.createElement("button");if(a.className="nav-toggle",a.type="button",a.setAttribute("aria-label","Men\xFCy\xFC a\xE7"),a.setAttribute("aria-expanded","false"),a.innerHTML='<i data-lucide="menu"></i>',a.style.display="none",document.querySelector(".nav-container").insertBefore(a,e),e&&t&&!document.getElementById("mobile-auth-actions")){const n=document.createElement("div");n.id="mobile-auth-actions",n.className="mobile-auth-actions",n.innerHTML=`
                <button type="button" class="btn btn-outline" data-mobile-login>Giri\u015F Yap</button>
                <button type="button" class="btn btn-primary" data-mobile-register>\xDCye Ol</button>
            `,e.append(n)}a.addEventListener("click",()=>{const n=e.classList.toggle("show");a.setAttribute("aria-expanded",String(n)),a.setAttribute("aria-label",n?"Men\xFCy\xFC kapat":"Men\xFCy\xFC a\xE7")});const s=1180,i=()=>{window.innerWidth<s?(a.style.display="inline-flex",a.setAttribute("aria-expanded","false"),a.setAttribute("aria-label","Men\xFCy\xFC a\xE7"),e.classList.remove("show")):(a.style.display="none",e.classList.add("show"))};window.addEventListener("resize",i),i()}setupKeyboardShortcuts(){document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="k"){e.preventDefault();const t=document.getElementById("search-input");t&&t.focus()}(e.ctrlKey||e.metaKey)&&e.key==="/"&&(e.preventDefault(),this.showHelpModal())})}loadIcons(){typeof lucide<"u"&&lucide.createIcons()}updateCollectionBadges({favorites:e=0,comparisons:t=0}={}){this.setNavCount("favorites-count",e),this.setNavCount("comparison-count",t)}setNavCount(e,t=0){const a=document.getElementById(e);if(!a)return;const s=Math.max(0,Number(t)||0);a.textContent=s>9?"9+":String(s),a.hidden=s===0,a.setAttribute("aria-label",s+" kay\u0131t")}updateAuthUI(e){const t=document.getElementById("nav-auth"),a=document.getElementById("nav-user"),s=document.getElementById("nav-messages");e?(t.style.display="none",a.style.display="flex",s&&(s.style.display="block")):(t.style.display="flex",a.style.display="none",s&&(s.style.display="none"))}updateUserUI(e){const t=document.getElementById("user-name");t&&e&&(t.textContent=e.full_name||e.email),this.renderProfile(e)}renderProfile(e){const t=document.getElementById("profil");if(!t)return;const a=t.querySelector(".profile-card");a&&(e&&(e.full_name||e.email)?a.innerHTML=`
                <h3>Merhaba, ${this.escapeHtml(e.full_name||e.email)}</h3>
                <p>Hesab\u0131n\u0131z haz\u0131r. Profil bilgilerinizi g\xFCncelleyebilir, ilanlar\u0131n\u0131z\u0131 y\xF6netebilir ve favorilerinizi takip edebilirsiniz.</p>
                <div class="profile-summary">
                    <div><strong>Ad Soyad:</strong> ${this.escapeHtml(e.full_name||"Bilinmiyor")}</div>
                    <div><strong>E-posta:</strong> ${this.escapeHtml(e.email||"Bilinmiyor")}</div>
                    <div><strong>Rol:</strong> ${this.escapeHtml(e.role||"Kullan\u0131c\u0131")}</div>
                </div>
                <div class="profile-actions">
                    <button class="btn btn-primary" id="edit-profile-btn">Profili D\xFCzenle</button>
                    <button class="btn btn-outline" id="profile-logout-btn">\xC7\u0131k\u0131\u015F Yap</button>
                </div>
            `:a.innerHTML=`
                <h3>Profiliniz haz\u0131r de\u011Fil</h3>
                <p>Giri\u015F yaparak profil bilgilerinizi g\xF6rebilir ve ilan olu\u015Fturabilirsiniz.</p>
                <button class="btn btn-primary" id="profile-login-btn">Giri\u015F Yap veya Kay\u0131t Ol</button>
            `,this.loadIcons())}showAdminLink(){const e=document.getElementById("admin-link");e&&(e.style.display="block")}renderCategories(e,t=null){const a=document.getElementById("categories-grid");a&&(a.innerHTML=e.map(s=>this.getCategoryCardMarkup(s,t)).join(""),this.loadIcons())}renderHeroCategories(e,t=null){const a=document.getElementById("hero-categories");a&&(a.innerHTML=e.slice(0,6).map(s=>this.getCategoryButtonMarkup(s,t)).join(""),this.loadIcons())}renderCategoryMenu(e,t=null){const a=document.getElementById("category-menu");a&&(a.innerHTML=e.map(s=>`
            <a href="/ilanlar" data-category="${this.escapeHtml(s.id)}" class="${s.id===t?"active":""}">${this.escapeHtml(s.name)} \u0130lanlar\u0131</a>
        `).join(""))}renderCategorySelect(e){const t=document.getElementById("listing-category");t&&(t.innerHTML=e.map(a=>`
            <option value="${this.escapeHtml(a.id)}">${this.escapeHtml(a.name)}</option>
        `).join(""))}clearDecisionResults(){const e=document.getElementById("assistant-results");e&&(e.innerHTML="")}renderDecisionAssistant(e,t,a={},s={}){const i=document.getElementById("assistant-category-rail"),n=document.getElementById("assistant-progress"),r=document.getElementById("assistant-questions"),o=document.querySelector("#decision-assistant-form .assistant-actions"),l=document.getElementById("assistant-results");if(!i||!n||!r||!e[t])return;const d=Object.entries(e),c=e[t],p=Array.isArray(s.steps)&&s.steps.length?s.steps:[{id:"questions",label:"Sorular",eyebrow:"1. ad\u0131m",description:c.description,questions:c.questions}],h=Math.max(0,Math.min(Number(s.stepIndex||0),p.length-1)),u=p[h],y=new Set(u.questions.map(m=>m.id));i.innerHTML=d.map(([m,g])=>'<button type="button" class="assistant-category '+(m===t?"active":"")+'" data-assistant-category="'+this.escapeHtml(m)+'"><i data-lucide="'+this.escapeHtml(g.icon)+'"></i><span>'+this.escapeHtml(g.name)+"</span><small>"+this.escapeHtml(g.description||"Karar ak\u0131\u015F\u0131")+"</small></button>").join(""),n.innerHTML='<div class="assistant-progress-head"><div><span class="assistant-kicker">'+this.escapeHtml(c.name)+" karar asistan\u0131</span><h3>"+this.escapeHtml(u.label)+"</h3><p>"+this.escapeHtml(u.description||c.description)+'</p></div><span class="assistant-step-count">'+this.escapeHtml(h+1)+"/"+this.escapeHtml(p.length)+"</span></div>"+this.getAssistantWizardTimelineMarkup(p,h);const k=c.questions.filter(m=>!y.has(m.id)&&a[m.id]!==void 0).map(m=>'<input type="hidden" name="'+this.escapeHtml(m.id)+'" value="'+this.escapeHtml(a[m.id]||"")+'">').join("");r.innerHTML='<div class="assistant-step-intro"><span class="assistant-kicker">'+this.escapeHtml(u.eyebrow||"Ad\u0131m")+"</span><h4>"+this.escapeHtml(u.label)+"</h4><p>"+this.escapeHtml(u.description||"")+"</p></div>"+k+u.questions.map((m,g)=>this.getAssistantQuestionMarkup(m,g,a)).join(""),o&&(o.innerHTML=this.getAssistantWizardActionsMarkup(h,p.length)),l&&!Object.keys(a).length&&(l.innerHTML=""),this.loadIcons()}getAssistantWizardTimelineMarkup(e,t){const a=[{id:"category",label:"Kategori",done:!0}].concat(e).concat([{id:"result",label:"Sonu\xE7"}]);return'<div class="assistant-wizard-steps">'+a.map((s,i)=>{const n=i-1,r=i===0,o=i===a.length-1,l=!r&&!o&&n===t,d=r||!o&&n<t;return'<div class="assistant-wizard-step '+(l?"active":d?"done":"pending")+'"><span>'+this.escapeHtml(i+1)+"</span><strong>"+this.escapeHtml(s.label)+"</strong></div>"}).join("")+"</div>"}getAssistantQuestionMarkup(e,t,a={}){const i=!["select","number"].includes(e.type)?e.options?.[0]?.value:"",n=a[e.id]??i,r=e.type==="select"?"select-question":e.type==="number"?"number-question":"",o=e.type==="select"?this.getSelectQuestionMarkup(e,n):e.type==="number"?this.getNumberQuestionMarkup(e,n):'<div class="assistant-options">'+(Array.isArray(e.options)?e.options:[]).map(l=>{const d="assistant-"+e.id+"-"+l.value;return'<label class="assistant-option" for="'+this.escapeHtml(d)+'"><input type="radio" id="'+this.escapeHtml(d)+'" name="'+this.escapeHtml(e.id)+'" value="'+this.escapeHtml(l.value)+'" '+(n===l.value?"checked":"")+"><span>"+this.escapeHtml(l.label)+"</span></label>"}).join("")+"</div>";return'<fieldset class="assistant-question '+r+'"><legend><span>'+this.escapeHtml(t+1)+"</span>"+this.escapeHtml(e.label)+"</legend>"+o+"</fieldset>"}getAssistantWizardActionsMarkup(e,t){const a=e<=0,s=e>=t-1;return(a?"":'<button type="button" class="btn btn-outline" data-assistant-prev><i data-lucide="arrow-left"></i> \xD6nceki</button>')+'<button type="button" class="btn btn-outline" data-assistant-reset><i data-lucide="rotate-ccw"></i> Temizle</button>'+(s?'<button type="submit" class="btn btn-primary"><i data-lucide="sparkles"></i> Sonucu hesapla</button>':'<button type="button" class="btn btn-primary" data-assistant-next>Devam et <i data-lucide="arrow-right"></i></button>')}getNumberQuestionMarkup(e,t){const a=e.placeholder||"Tutar yaz\u0131n",s=Number.isFinite(Number(e.min))?e.min:0,i=Number.isFinite(Number(e.step))?e.step:1e3;return`
            <div class="assistant-number-field">
                <input class="assistant-select assistant-number-input" type="number" inputmode="numeric" name="${this.escapeHtml(e.id)}" value="${this.escapeHtml(t||"")}" min="${this.escapeHtml(s)}" step="${this.escapeHtml(i)}" placeholder="${this.escapeHtml(a)}" ${e.required===!1?"":"required"}>
                <span>TL</span>
            </div>
        `}getSelectQuestionMarkup(e,t){const a=e.placeholder||"Se\xE7im yap\u0131n",s=Array.isArray(e.options)?e.options:[];return`
            <select class="assistant-select" name="${this.escapeHtml(e.id)}" ${e.required?"required":""}>
                <option value="">${this.escapeHtml(a)}</option>
                ${s.map(i=>`
                    <option value="${this.escapeHtml(i.value)}" ${t===i.value?"selected":""}>${this.escapeHtml(i.label)}</option>
                `).join("")}
            </select>
        `}renderDecisionResults(e){const t=document.getElementById("assistant-results");if(!t)return;const a=e.recommendations[0];if(!a){t.innerHTML='<div class="empty-state"><i data-lucide="search-x"></i><h3>Sonu\xE7 \xFCretilemedi</h3><p>Cevaplar\u0131n\u0131z\u0131 de\u011Fi\u015Ftirerek tekrar deneyin.</p></div>',this.loadIcons();return}const s=a.financeComparisons?.[0];t.innerHTML='<section class="assistant-decision-panel"><div class="assistant-result-header assistant-decision-hero"><div><span class="assistant-kicker">AI karar paneli</span><h3>'+this.escapeHtml(a.name)+"</h3><p>"+this.escapeHtml(e.summary)+'</p><div class="assistant-result-badges"><span><i data-lucide="map-pin"></i>'+this.escapeHtml(e.categoryName)+'</span><span><i data-lucide="shield-check"></i>G\xFCven skoru '+this.escapeHtml(a.score)+"/100</span>"+(e.dataHealth?'<span><i data-lucide="database-zap"></i>Veri g\xFCveni '+this.escapeHtml(e.dataHealth.confidenceScore)+"/100</span>":"")+'<span><i data-lucide="clock-3"></i>'+this.escapeHtml(this.formatDate(e.createdAt))+'</span></div></div><div class="assistant-score assistant-score-large"><strong>'+this.escapeHtml(a.score)+'</strong><span>/100</span></div></div><div class="assistant-decision-toolbar"><button type="button" class="btn btn-outline" data-assistant-edit="0"><i data-lucide="sliders-horizontal"></i> Kriterleri g\xFCncelle</button><button type="button" class="btn btn-primary" data-browse-decision-listings><i data-lucide="list-checks"></i> E\u015Fle\u015Fen se\xE7enekleri a\xE7</button></div>'+this.getExecutiveMetricsMarkup(e.categoryId,a,s)+this.getDataHealthMarkup(e.dataHealth)+'<div class="assistant-answer-summary">'+e.answers.map(i=>"<span><strong>"+this.escapeHtml(i.label)+":</strong> "+this.escapeHtml(i.value)+"</span>").join("")+"</div>"+this.getDecisionInsightMarkup(e.insight)+this.getChoiceSummaryMarkup(e.categoryId,e.recommendations)+'<div class="assistant-recommendations">'+e.recommendations.map((i,n)=>'<article class="assistant-recommendation '+(n===0?"featured":"")+'">'+this.getRecommendationVerdictMarkup(e.categoryId,i,n,e.recommendations)+'<div class="assistant-recommendation-top"><div><span class="assistant-rank">'+(n+1)+". se\xE7enek</span><h4>"+this.escapeHtml(i.name)+"</h4><p>"+this.escapeHtml(i.scoreNote)+'</p></div><strong class="assistant-price">'+this.formatPrice(i.price)+" \u20BA</strong></div>"+this.getRecommendationHighlightsMarkup(i)+'<div class="assistant-recommendation-actions"><button type="button" class="btn btn-outline" data-compare-recommendation="'+this.escapeHtml(n)+'"><i data-lucide="columns-3"></i> Kar\u015F\u0131la\u015Ft\u0131rmaya ekle</button></div>'+this.getRecommendationDetailsMarkup(i.details)+this.getRealisticCommentMarkup(i.realisticComment)+this.getRecommendationSourceTraceMarkup(i.sourceTrace)+this.getScoreBreakdownMarkup(i.scoreBreakdown,i.decisionTags)+this.getCategoryCalculationMarkup(i.calculationTable)+this.getCostChartMarkup(i.costChart)+'<div class="assistant-cost-grid">'+this.getCostMarkup(i.costs)+'<div class="assistant-cost total"><span>'+this.escapeHtml(i.calculationTable?.totalLabel||"Toplam d\xF6nemsel maliyet")+"</span><strong>"+this.formatPrice(i.yearlyCost)+' \u20BA</strong></div></div><div class="assistant-finance"><h5>Banka kredi kar\u015F\u0131la\u015Ft\u0131rmas\u0131</h5>'+this.getFinanceMarkup(i.financeComparisons)+"</div>"+this.getRecommendationActionPlanMarkup(e.categoryId,i)+'<div class="assistant-channels"><h5>Nereden bakabilirsiniz?</h5><div>'+this.getChannelsMarkup(i.channels)+"</div></div></article>").join("")+"</div></section>",t.scrollIntoView({behavior:"smooth",block:"start"}),this.loadIcons()}getDecisionMetricMarkup(e,t,a,s){return'<article class="assistant-executive-metric"><i data-lucide="'+this.escapeHtml(s)+'"></i><span>'+this.escapeHtml(e)+"</span><strong>"+this.escapeHtml(t)+"</strong><small>"+this.escapeHtml(a)+"</small></article>"}getExecutiveMetricsMarkup(e,t,a){const s=a?.totalPayment||0,i=a?.monthlyPayment||0,n={arac:{price:"Ara\xE7 bedeli",period:"Y\u0131ll\u0131k sahip olma",periodNote:"Yak\u0131t/enerji, kasko, sigorta ve bak\u0131m",monthly:"En d\xFC\u015F\xFCk ta\u015F\u0131t kredisi",total:"Toplam kredi geri \xF6deme"},ev:{price:"Konut al\u0131m bedeli",period:"Y\u0131ll\u0131k konut gideri",periodNote:"Aidat/bak\u0131m, sigorta, vergi ve yenileme",monthly:"Konut kredisi taksiti",total:"Toplam kredi geri \xF6deme"},tatil:{price:"Tatil paket b\xFCt\xE7esi",period:"Seyahat ek gideri",periodNote:"Konaklama, ula\u015F\u0131m, aktivite ve sigorta",monthly:"Tatil finansman\u0131",total:"Toplam \xF6deme sim\xFClasyonu"}},r=n[e]||n.arac;return'<div class="assistant-executive-metrics">'+this.getDecisionMetricMarkup(r.price,this.formatPrice(t.price)+" \u20BA","Se\xE7ilen kategoriye \xF6zel tahmini ana bedel","wallet")+this.getDecisionMetricMarkup(r.period,this.formatPrice(t.yearlyCost)+" \u20BA",r.periodNote,"calculator")+this.getDecisionMetricMarkup(r.monthly,this.formatPrice(i)+" \u20BA",a?a.bank+" sim\xFClasyonu":"Banka verisi yok","landmark")+this.getDecisionMetricMarkup(r.total,this.formatPrice(s)+" \u20BA",a?a.term+" ay vade":"Sim\xFClasyon bekliyor","receipt")+"</div>"}getRecommendationDetailsMarkup(e=[]){return!Array.isArray(e)||!e.length?"":'<div class="assistant-detail-grid">'+e.map(t=>'<div class="assistant-detail-item"><span>'+this.escapeHtml(t.label)+"</span><strong>"+this.escapeHtml(t.value)+"</strong></div>").join("")+"</div>"}getRealisticCommentMarkup(e){return e?'<article class="assistant-realistic-comment"><span class="assistant-kicker">Ger\xE7ek\xE7i yorum</span><p>'+this.escapeHtml(e)+"</p></article>":""}getDataHealthMarkup(e){if(!e)return"";const t=Array.isArray(e.sources)?e.sources:[];return'<section class="assistant-data-health"><div class="assistant-data-health-head"><div><span class="assistant-kicker">Veri g\xFCven merkezi</span><h4>'+this.escapeHtml(e.confidenceLabel||"Veri g\xFCveni")+"</h4><p>"+this.escapeHtml(e.modeLabel||"")+" \xB7 "+this.escapeHtml(e.updatedAtLabel||"")+'</p></div><div class="assistant-data-confidence"><strong>'+this.escapeHtml(e.confidenceScore||"-")+'</strong><span>/100</span></div></div><div class="assistant-data-health-grid"><div><span>Haz\u0131r kaynak</span><strong>'+this.escapeHtml(e.readySourceCount||0)+"/"+this.escapeHtml(e.sourceCount||0)+"</strong></div><div><span>Kredi \xFCr\xFCn\xFC</span><strong>"+this.escapeHtml(e.financeProductCount||0)+"</strong></div><div><span>Hesap kalemi</span><strong>"+this.escapeHtml(e.calculationCount||0)+"</strong></div><div><span>Sa\u011Flay\u0131c\u0131</span><strong>"+this.escapeHtml(e.liveProvidersEnabled?"Canl\u0131":"Haz\u0131r")+"</strong></div></div>"+(t.length?'<div class="assistant-source-list">'+t.map(a=>this.getSourcePillMarkup(a)).join("")+"</div>":"")+'<p class="assistant-data-note">'+this.escapeHtml(e.providerNote||"")+"</p></section>"}getRecommendationSourceTraceMarkup(e){if(!e)return"";const t=Array.isArray(e.sources)?e.sources:[];return'<section class="assistant-source-trace"><div class="assistant-source-trace-head"><div><span class="assistant-kicker">Veri izi</span><h5>'+this.escapeHtml(e.sourceSummary||"Kaynak \xF6zeti")+"</h5></div><small>"+this.escapeHtml(e.updatedAtLabel||"")+"</small></div><p>"+this.escapeHtml(e.calculationSummary||"")+"</p>"+(t.length?'<div class="assistant-source-list compact">'+t.map(a=>this.getSourcePillMarkup(a)).join("")+"</div>":"")+"</section>"}getSourcePillMarkup(e){const t="<span>"+this.escapeHtml(e.type||"Kaynak")+"</span><strong>"+this.escapeHtml(e.name||"Veri kayna\u011F\u0131")+"</strong><small>"+this.escapeHtml(e.status||e.cadence||"")+"</small>";return e.url?'<a class="assistant-source-pill" href="'+this.safeExternalUrl(e.url)+'" target="_blank" rel="noopener noreferrer">'+t+"</a>":'<div class="assistant-source-pill">'+t+"</div>"}getCategoryCalculationMarkup(e){return!e||!Array.isArray(e.rows)||!e.rows.length?"":'<section class="assistant-calculation-table"><div class="assistant-calculation-head"><div><h5>'+this.escapeHtml(e.title||"Hesaplama tablosu")+"</h5><p>"+this.escapeHtml(e.note||"")+"</p></div><strong>"+this.formatPrice(e.totalValue||0)+' \u20BA</strong></div><div class="assistant-calculation-rows">'+e.rows.map(t=>'<div class="assistant-calculation-row"><div><span>'+this.escapeHtml(t.label)+"</span><small>"+this.escapeHtml(t.note||"")+"</small></div><strong>"+this.formatPrice(t.value||0)+" \u20BA</strong></div>").join("")+"</div></section>"}getCostChartMarkup(e=[]){return!Array.isArray(e)||!e.length?"":'<section class="assistant-cost-chart"><div class="assistant-chart-head"><h5>Grafikli maliyet da\u011F\u0131l\u0131m\u0131</h5><span>Kalemlerin toplam i\xE7indeki pay\u0131</span></div><div class="assistant-chart-bars">'+e.map(t=>'<div class="assistant-chart-row"><div><span>'+this.escapeHtml(t.label)+"</span><strong>"+this.formatPrice(t.value||0)+' \u20BA</strong></div><i><b style="width: '+this.escapeHtml(t.percent||0)+'%"></b></i><small>%'+this.escapeHtml(t.percent||0)+"</small></div>").join("")+"</div></section>"}getChoiceSummaryMarkup(e,t=[]){const a=Array.isArray(t)?t.slice(0,3):[];return a.length?'<section class="assistant-choice-summary"><div class="assistant-choice-summary-head"><div><span class="assistant-kicker">Se\xE7im \xF6zeti</span><h4>\u0130lk bak\u0131\u015Fta karar haritas\u0131</h4></div><small>Detayl\u0131 maliyet, kredi ve kaynak bilgileri kartlar\u0131n i\xE7inde devam eder.</small></div><div class="assistant-choice-grid">'+a.map((s,i)=>this.getChoiceSummaryCardMarkup(e,s,i,a)).join("")+"</div></section>":""}getChoiceSummaryCardMarkup(e,t,a,s=[]){const i=this.getRecommendationVerdict(e,t,a,s);return'<article class="assistant-choice-card"><span class="assistant-choice-rank">'+this.escapeHtml(a+1)+"</span><div><strong>"+this.escapeHtml(i.label)+"</strong><p>"+this.escapeHtml(t.name||"Se\xE7enek")+"</p></div><small>"+this.escapeHtml(t.score||"-")+"/100 \xB7 "+this.formatPrice(t.price||0)+" \u20BA</small></article>"}getRecommendationVerdict(e,t={},a=0,s=[]){const i=s.map(c=>Number(c.price||0)).filter(c=>c>0),n=s.map(c=>Number(c.yearlyCost||0)).filter(c=>c>0),r=i.length?Math.min(...i):0,o=n.length?Math.min(...n):0,l={arac:{primary:"Ara\xE7ta en dengeli karar skoru; sahip olma maliyeti ve finansman birlikte g\xFC\xE7l\xFC.",budget:"Ara\xE7 bedeli daha kontroll\xFC; ekspertiz ve toplam sahip olma gideri yine do\u011Frulanmal\u0131.",cost:"Yak\u0131t, kasko, sigorta ve bak\u0131m taraf\u0131nda daha sakin bir senaryo sunar.",alternative:"Kullan\u0131m profili de\u011Fi\u015Firse de\u011Ferlendirilebilecek g\xFC\xE7l\xFC alternatif."},ev:{primary:"Konut taraf\u0131nda lokasyon, likidite, y\u0131ll\u0131k gider ve kredi y\xFCk\xFC birlikte dengeli.",budget:"Al\u0131m bedeli daha eri\u015Filebilir; tapu, deprem ve m2 emsali ayr\u0131ca kontrol edilmeli.",cost:"Aidat, bak\u0131m, vergi ve sigorta y\xFCk\xFC daha kontroll\xFC bir senaryo \xFCretir.",alternative:"Ya\u015Fam amac\u0131 veya yat\u0131r\u0131m beklentisi de\u011Fi\u015Firse g\xFC\xE7l\xFC alternatif olabilir."},tatil:{primary:"Tatil plan\u0131nda b\xFCt\xE7e, sezon, ula\u015F\u0131m ve iptal esnekli\u011Fi en dengeli noktada.",budget:"Paket bedeli daha kontroll\xFC; ula\u015F\u0131m ve ekstra harcamalar son fiyat\u0131 belirler.",cost:"Konaklama d\u0131\u015F\u0131 ula\u015F\u0131m, aktivite ve sigorta y\xFCk\xFC daha kontroll\xFC g\xF6r\xFCn\xFCr.",alternative:"Tatil tarz\u0131 veya tarih de\u011Fi\u015Firse de\u011Ferlendirilebilecek iyi alternatif."}},d=l[e]||l.arac;return a===0?{icon:"badge-check",label:"\xD6nerilen se\xE7im",text:d.primary}:r&&Number(t.price||0)===r?{icon:"wallet-cards",label:"B\xFCt\xE7e odakl\u0131",text:d.budget}:o&&Number(t.yearlyCost||0)===o?{icon:"trending-down",label:"D\xFC\u015F\xFCk giderli",text:d.cost}:{icon:"route",label:"Alternatif senaryo",text:d.alternative}}getRecommendationVerdictMarkup(e,t={},a=0,s=[]){const i=this.getRecommendationVerdict(e,t,a,s);return'<div class="assistant-recommendation-verdict"><span><i data-lucide="'+this.escapeHtml(i.icon)+'"></i>'+this.escapeHtml(i.label)+"</span><p>"+this.escapeHtml(i.text)+"</p></div>"}getRecommendationHighlightsMarkup(e){const t=e.financeComparisons?.[0];return'<div class="assistant-recommendation-highlights"><span><strong>'+this.escapeHtml(e.score)+"/100</strong> uygunluk</span><span><strong>"+this.escapeHtml(e.riskLevel||"Kontrol gerekli")+"</strong> risk</span><span><strong>"+this.formatPrice(e.yearlyCost)+" \u20BA</strong> d\xF6nemsel maliyet</span><span><strong>"+(t?this.formatPrice(t.monthlyPayment)+" \u20BA/ay":"Yok")+"</strong> en iyi kredi</span></div>"}getScoreBreakdownMarkup(e=[],t=[]){const a=Array.isArray(e)?e:[],s=(Array.isArray(t)?t:[]).map(n=>"<span>"+this.escapeHtml(n)+"</span>").join(""),i=a.map(n=>'<li class="'+(n.positive?"positive":"negative")+'"><span>'+this.escapeHtml(n.label)+"</span><strong>"+this.escapeHtml(n.status)+" "+(n.delta>0?"+":"")+this.escapeHtml(n.delta)+"</strong></li>").join("");return'<div class="assistant-score-breakdown">'+(s?'<div class="assistant-decision-tags">'+s+"</div>":"")+"<ul>"+i+"</ul></div>"}getDecisionInsightMarkup(e){if(!e)return"";const t=(a=[])=>a.map(s=>`<li>${this.escapeHtml(s)}</li>`).join("");return`
            <article class="assistant-insight">
                <div>
                    <span class="assistant-kicker">AI a\xE7\u0131klamas\u0131</span>
                    <h4>${this.escapeHtml(e.headline)}</h4>
                </div>
                <div class="assistant-insight-grid">
                    <div>
                        <h5>Neden?</h5>
                        <ul>${t(e.reasons)}</ul>
                    </div>
                    <div>
                        <h5>Dikkat</h5>
                        <ul>${t(e.cautions)}</ul>
                    </div>
                    <div>
                        <h5>Sonraki ad\u0131m</h5>
                        <ul>${t(e.nextSteps)}</ul>
                    </div>
                </div>
            </article>
        `}renderHistoryAuthGate(){const e=document.getElementById("history-list");e&&(e.innerHTML=`
            <div class="empty-state history-auth-gate">
                <i data-lucide="lock-keyhole"></i>
                <h3>Ge\xE7mi\u015F i\xE7in giri\u015F yap\u0131n</h3>
                <p>Karar, b\xFCt\xE7e, konum ve arama ge\xE7mi\u015Finiz yaln\u0131zca hesab\u0131n\u0131za ba\u011Fl\u0131 olarak saklan\u0131r.</p>
                <div class="history-auth-actions">
                    <button type="button" class="btn btn-primary" data-history-login><i data-lucide="log-in"></i> Giri\u015F Yap</button>
                    <button type="button" class="btn btn-outline" data-history-register><i data-lucide="user-plus"></i> \xDCye Ol</button>
                </div>
            </div>
        `,this.loadIcons())}renderDecisionHistory(e=[]){const t=document.getElementById("history-list");if(t){if(!e.length){t.innerHTML=`
                <div class="empty-state">
                    <i data-lucide="clock"></i>
                    <h3>Ge\xE7mi\u015F bulunamad\u0131</h3>
                    <p>Ak\u0131ll\u0131 karar ak\u0131\u015F\u0131n\u0131 tamamlad\u0131\u011F\u0131n\u0131zda sonu\xE7lar burada saklanacak.</p>
                </div>
            `,this.loadIcons();return}t.innerHTML=e.map(a=>`
            <article class="decision-history-card">
                <div class="decision-history-main">
                    <div>
                        <span class="assistant-kicker">${this.escapeHtml(a.categoryName||"Karar")}</span>
                        <h3>${this.escapeHtml(a.topPick?.name||"Kaydedilen karar")}</h3>
                        <p>${this.escapeHtml(a.summary||"\xD6zet bulunamad\u0131.")}</p>
                    </div>
                    <div class="decision-history-score">
                        <strong>${this.escapeHtml(a.topPick?.score||"-")}</strong>
                        <span>/100</span>
                    </div>
                </div>
                <div class="decision-history-metrics">
                    <span><strong>Fiyat:</strong> ${this.formatPrice(a.topPick?.price||0)} \u20BA</span>
                    <span><strong>D\xF6nemsel maliyet:</strong> ${this.formatPrice(a.topPick?.yearlyCost||0)} \u20BA</span>
                    <span><strong>Ayl\u0131k kredi:</strong> ${this.formatPrice(a.topPick?.monthlyPayment||0)} \u20BA</span>
                    <span><strong>Tarih:</strong> ${this.formatDate(a.createdAt)}</span>
                </div>
                <div class="decision-history-answers">
                    ${(a.answers||[]).map(s=>`<span>${this.escapeHtml(s.label)}: ${this.escapeHtml(s.value)}</span>`).join("")}
                </div>
                <div class="decision-history-actions">
                    <button type="button" class="btn btn-primary" data-decision-repeat="${this.escapeHtml(a.id)}">
                        <i data-lucide="refresh-cw"></i> Tekrar a\xE7
                    </button>
                    <button type="button" class="btn btn-outline" data-decision-delete="${this.escapeHtml(a.id)}">
                        <i data-lucide="trash-2"></i> Sil
                    </button>
                </div>
            </article>
        `).join(""),this.loadIcons()}}getCostMarkup(e=[]){return e.map(t=>`
            <div class="assistant-cost">
                <span>${this.escapeHtml(t.label)}</span>
                <strong>${this.formatPrice(t.value)} \u20BA</strong>
            </div>
        `).join("")}getFinanceMarkup(e=[]){return`
            <div class="assistant-finance-table">
                ${e.map(t=>`
                    <div class="assistant-finance-row">
                        <span>${this.escapeHtml(t.bank)}</span>
                        <strong>${this.formatPrice(t.monthlyPayment)} \u20BA/ay</strong>
                        <small>${this.escapeHtml(t.term)} ay, %${this.escapeHtml(t.rate)} ayl\u0131k, kredi ${this.formatPrice(t.principal)} \u20BA</small>
                    </div>
                `).join("")}
            </div>
        `}getRecommendationActionPlanMarkup(e,t={}){const a=t.channels?.[0]?.url||"https://www.sahibinden.com/",s={arac:[{icon:"search-check",title:"Ger\xE7ek ilan\u0131 do\u011Frula",text:"KM, tramer, fiyat ve sat\u0131c\u0131 bilgisini ayn\u0131 model ilanlarla kar\u015F\u0131la\u015Ft\u0131r\u0131n.",url:a},{icon:"landmark",title:"Krediyi netle\u015Ftir",text:"Ayl\u0131k taksit yerine toplam geri \xF6deme ve kredi kulland\u0131r\u0131m oran\u0131n\u0131 kontrol edin.",url:"https://www.hangikredi.com/kredi/tasit-kredisi"},{icon:"shield-check",title:"Sigorta + ekspertiz",text:"Kasko, trafik sigortas\u0131 ve ekspertiz sonucu olmadan kapora g\xF6ndermeyin.",url:"https://www.sigortam.net/"}],ev:[{icon:"map-pinned",title:"Emsal ilan analizi",text:"Ayn\u0131 il/il\xE7ede m2, bina ya\u015F\u0131, aidat ve ula\u015F\u0131m etkisini yan yana okuyun.",url:a},{icon:"landmark",title:"Konut kredisi",text:"Ekspertiz de\u011Feri, pe\u015Finat ihtiyac\u0131 ve toplam geri \xF6deme plan\u0131n\u0131 netle\u015Ftirin.",url:"https://www.hangikredi.com/kredi/konut-kredisi"},{icon:"file-check-2",title:"Tapu + deprem kontrol\xFC",text:"Tapu, imar, DASK, deprem performans\u0131 ve aidat borcunu sat\u0131n alma \xF6ncesi do\u011Frulay\u0131n.",url:"https://www.tkgm.gov.tr/"}],tatil:[{icon:"calendar-check",title:"Rezervasyon ko\u015Fulu",text:"Sezon, oda tipi, \xE7ocuk/ek ki\u015Fi \xFCcreti ve iptal \u015Fart\u0131n\u0131 paket fiyat\u0131na dahil edin.",url:a},{icon:"plane-takeoff",title:"Ula\u015F\u0131m\u0131 kar\u015F\u0131la\u015Ft\u0131r",text:"U\xE7u\u015F saati, bagaj, transfer ve ara\xE7 kiralama maliyetini ayr\u0131 g\xF6r\xFCn.",url:"https://www.enuygun.com/"},{icon:"shield",title:"Seyahat g\xFCveni",text:"Sigorta, esnek tarih ve erken rezervasyon fark\u0131n\u0131 son karar \xF6ncesi kontrol edin.",url:"https://www.etstur.com/"}]};return'<section class="assistant-action-plan"><div class="assistant-action-plan-head"><span class="assistant-kicker">Sat\u0131n alma aksiyonlar\u0131</span><h5>Karar\u0131 uygulamaya ge\xE7ir</h5></div><div class="assistant-action-plan-grid">'+(s[e]||s.arac).map(n=>'<a href="'+this.safeExternalUrl(n.url)+'" target="_blank" rel="noopener noreferrer" class="assistant-action-step"><i data-lucide="'+this.escapeHtml(n.icon)+'"></i><strong>'+this.escapeHtml(n.title)+"</strong><span>"+this.escapeHtml(n.text)+"</span></a>").join("")+"</div></section>"}getChannelsMarkup(e=[]){return e.map(t=>`
            <a href="${this.safeExternalUrl(t.url)}" target="_blank" rel="noopener noreferrer" class="assistant-channel">
                <i data-lucide="external-link"></i>
                ${this.escapeHtml(t.label)}
            </a>
        `).join("")}setActiveCategory(e,t=[]){const a=document.getElementById("active-category-label"),s=t.find(i=>i.id===e);document.querySelectorAll("[data-category]").forEach(i=>{i.classList.toggle("active",!!e&&i.dataset.category===e)}),a&&(a.textContent=s?`${s.name} ilanlar\u0131`:"Son \u0130lanlar")}getCategoryVisualIcon(e,t="tag"){return{arac:"car-front",ev:"house",tatil:"plane-takeoff"}[e]||t}getCategoryCardMarkup(e,t=null){return`
            <button type="button" class="category-card category-card-${this.escapeHtml(e.id)} ${e.id===t?"active":""}" data-category="${this.escapeHtml(e.id)}">
                <span class="category-visual category-visual-${this.escapeHtml(e.id)}" aria-hidden="true">
                    <i data-lucide="${this.escapeHtml(this.getCategoryVisualIcon(e.id,e.icon))}"></i>
                </span>
                <h3>${this.escapeHtml(e.name)}</h3>
                <span class="category-count">${this.escapeHtml(e.count||0)} ilan</span>
            </button>
        `}getCategoryButtonMarkup(e,t=null){return`
            <button type="button" class="category-card category-card-${this.escapeHtml(e.id)} ${e.id===t?"active":""}" data-assistant-start="${this.escapeHtml(e.id)}">
                <span class="category-visual category-visual-${this.escapeHtml(e.id)}" aria-hidden="true">
                    <i data-lucide="${this.escapeHtml(this.getCategoryVisualIcon(e.id,e.icon))}"></i>
                </span>
                <span>${this.escapeHtml(e.name)}</span>
            </button>
        `}getListingLocationLabel(e={}){return e.province?e.province+(e.district?"/"+e.district:" geneli"):e.location||"Konum belirtilmemi\u015F"}getListingPrimaryActionLabel(e){return{arac:"\u0130lana Git",ev:"Emlak Kayna\u011F\u0131",tatil:"Paketi G\xF6r"}[e]||"\u0130lana Git"}getListingInsightItems(e={},t=0){const a=Array.isArray(e.decisionHighlights)&&e.decisionHighlights.length?e.decisionHighlights.slice(0,3):[];return!a.length&&e.category==="arac"&&a.push(e.vehicleBrand||"Marka uygun",e.vehicleFuel||"Maliyet kontroll\xFC","Kredi kontrol\xFC"),!a.length&&e.category==="ev"&&a.push("Konut analizi","Tapu kontrol\xFC","Kredi sim\xFClasyonu"),!a.length&&e.category==="tatil"&&a.push("Tatil analizi","Paket kontrol\xFC","\u0130ptal ko\u015Fulu"),[...a,"AI "+t+"/100"].slice(0,4)}getListingInsightsMarkup(e={},t=0){return'<div class="listing-insights">'+this.getListingInsightItems(e,t).map(a=>"<span>"+this.escapeHtml(a)+"</span>").join("")+"</div>"}getListingQualityScore(e={}){const a=78+String(e.id||e.title||"").split("").reduce((o,l)=>o+l.charCodeAt(0),0)%13,s=Number(e.price||0),i=e.created_at&&Date.now()-new Date(e.created_at).getTime()<4*864e5?4:0,n=s>0&&s<15e5?3:s>1e7?-2:1,r=e.external_url?2:0;return Math.max(68,Math.min(97,a+i+n+r))}getListingComparisonSignature(e={}){return"listing:"+(e.category||"genel")+":"+(e.id||"")}renderListingToolbar({count:e=0,options:t={},sort:a="aiScore",view:s="grid"}={}){const i=document.getElementById("marketplace-results-toolbar");if(!i)return;const n=document.getElementById("listing-result-count"),r=document.getElementById("listing-result-context"),o=document.getElementById("listing-sort");i.hidden=!1,n&&(n.textContent=e===1?"1 sonu\xE7":this.formatPrice(e)+" sonu\xE7"),r&&(r.textContent=this.getListingToolbarContext(t,e)),o&&o.value!==a&&(o.value=a),this.setListingView(s)}getListingToolbarContext(e={},t=0){const a=[],s={daire:"Daire",yazlik:"Yazl\u0131k",mustakil:"M\xFCstakil ev",villa:"Villa"},i={familyResort:"Aile / her \u015Fey dahil",luxury:"L\xFCks / premium",nature:"Do\u011Fa / sakinlik",culture:"K\xFClt\xFCr / deneyim"};return e.category&&a.push(this.getCategoryLabel(e.category)),e.province&&a.push(e.province+(e.district?"/"+e.district:" geneli")),e.vehicleBrand&&a.push(e.vehicleBrand),e.propertyType&&a.push(s[e.propertyType]||e.propertyType),e.vacationType&&a.push(i[e.vacationType]||e.vacationType),e.search&&a.push("Arama: "+e.search),e.ownedOnly||e.userId?t?"Yay\u0131nlad\u0131\u011F\u0131n\u0131z ilanlar":"Hen\xFCz ilan yay\u0131nlamad\u0131n\u0131z":t?a.length?a.join(" \xB7 "):"T\xFCrkiye geneli \xB7 AI skoruna g\xF6re ke\u015Fif":"Filtreleri geni\u015Fleterek yeni sonu\xE7lar bulun"}setListingView(e="grid"){const t=e==="compact"?"compact":"grid",a=document.getElementById("listings-grid");a&&a.classList.toggle("is-compact",t==="compact"),document.querySelectorAll("[data-listing-view]").forEach(s=>{const i=s.dataset.listingView===t;s.classList.toggle("active",i),s.setAttribute("aria-pressed",String(i))})}renderListings(e,t=[],a=[],s={}){const i=document.getElementById("listings-grid");if(!i)return;const n=new Set((Array.isArray(a)?a:[]).map(String));if(e.length===0){const r=!!(s.ownedOnly||s.userId);i.innerHTML=r?`
                <div class="empty-state marketplace-empty-state">
                    <i data-lucide="badge-plus"></i>
                    <h3>Hen\xFCz ilan\u0131n\u0131z yok</h3>
                    <p>\u0130lk ilan\u0131n\u0131z\u0131 ekledi\u011Finizde burada g\xF6r\xFCnecek ve AI kar\u015F\u0131la\u015Ft\u0131rma ak\u0131\u015F\u0131na dahil olacak.</p>
                    <a href="/ilan-ekle" class="btn btn-primary"><i data-lucide="plus"></i> \u0130lan Ver</a>
                </div>
            `:`
                <div class="empty-state marketplace-empty-state">
                    <i data-lucide="search"></i>
                    <h3>\u0130lan bulunamad\u0131</h3>
                    <p>Filtreleri geni\u015Fletin veya karar asistan\u0131ndan gelen \xF6nerilere g\xF6re tekrar aray\u0131n.</p>
                    <a href="/karar-asistani" class="btn btn-outline"><i data-lucide="sparkles"></i> AI Asistan\u0131 A\xE7</a>
                </div>
            `}else i.innerHTML=e.map(r=>{const o=this.escapeHtml(r.id),l=this.safeImageUrl(r.images?.[0]),d=this.safeExternalUrl(r.external_url),c=t.includes(r.id.toString()),p=n.has(this.getListingComparisonSignature(r)),h=this.getListingQualityScore(r),u=this.getCategoryLabel(r.category||""),y=this.getListingLocationLabel(r),k=this.getListingPrimaryActionLabel(r.category||"");return`
                <div class="listing-card" data-listing-id="${o}">
                    <div class="listing-media">
                        <img src="${l}"
                             alt="${this.escapeHtml(r.title)}"
                             class="listing-image"
                             onerror="this.src='/assets/images/placeholder.svg'">
                        <div class="listing-badges">
                            <span class="listing-ai-score"><i data-lucide="sparkles"></i> AI ${this.escapeHtml(h)}/100</span>
                            <span>${this.escapeHtml(u||"\u0130lan")}</span>
                        </div>
                    </div>
                    <div class="listing-content">
                        <h3 class="listing-title">${this.escapeHtml(r.title)}</h3>
                        <p class="listing-price">${this.formatPrice(r.price)} \u20BA</p>
                        <div class="listing-meta">
                            <span>${this.escapeHtml(y)}</span>
                            <span>${this.formatDate(r.created_at)}</span>
                        </div>
                        ${this.getListingInsightsMarkup(r,h)}
                        <div class="listing-actions">
                            <button class="btn ${c?"btn-primary":"btn-outline"} favorite-btn" data-action="favorite">
                                <i data-lucide="heart"></i> ${c?"Favorilerden \xC7\u0131kar":"Favorilere Ekle"}
                            </button>
                            <button class="btn btn-outline" data-action="detail" data-listing-id="${o}">
                                <i data-lucide="eye"></i> Detay
                            </button>
                            <button class="btn ${p?"btn-primary":"btn-outline"}" data-action="compare" data-listing-id="${o}">
                                <i data-lucide="${p?"check":"columns-3"}"></i> ${p?"Kar\u015F\u0131la\u015Ft\u0131rmada":"Kar\u015F\u0131la\u015Ft\u0131r"}
                            </button>
                            <a href="${d}" target="_blank" rel="noopener noreferrer" class="btn btn-primary external-btn"><i data-lucide="external-link"></i> ${this.escapeHtml(k)}</a>
                        </div>
                    </div>
                </div>
            `}).join("");this.loadIcons()}filterByCategory(e){v.setFilters({category:e}),document.dispatchEvent(new CustomEvent("filterChanged",{detail:{category:e}}))}showListingDetail(e){window.location.href=`/ilan/${e}`}renderListingDetailLoading(){const e=document.getElementById("listing-detail-content");e&&(e.innerHTML=`
            <div class="listing-detail-card listing-detail-premium">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>\u0130lan detaylar\u0131 haz\u0131rlan\u0131yor...</p>
                </div>
            </div>
        `)}renderListingDetail(e,t=[],a=null,s=[]){const i=document.getElementById("listing-detail-content");if(!i)return;const n=this.escapeHtml(e.id),r=this.safeImageUrl(e.images?.[0]),o=this.safeExternalUrl(e.external_url),l=t.includes(e.id.toString()),d=(Array.isArray(s)?s:[]).map(String).includes(this.getListingComparisonSignature(e)),c=this.getListingLocationLabel(e),p=this.getCategoryLabel(e.category||""),h=a?.score||this.getListingQualityScore(e),u=this.getListingPrimaryActionLabel(e.category||"");i.innerHTML=`
            <div class="listing-detail-card listing-detail-premium">
                <div class="listing-detail-header">
                    <div>
                        <span class="assistant-kicker">${this.escapeHtml(p||"\u0130lan")} detay analizi</span>
                        <h2>${this.escapeHtml(e.title)}</h2>
                        <div class="listing-detail-badges">
                            <span><i data-lucide="sparkles"></i> AI ${this.escapeHtml(h)}/100</span>
                            <span><i data-lucide="map-pin"></i> ${this.escapeHtml(c)}</span>
                            <span><i data-lucide="clock-3"></i> ${this.formatDate(e.created_at)}</span>
                        </div>
                    </div>
                    <p class="listing-price">${this.formatPrice(e.price)} \u20BA</p>
                </div>
                <div class="listing-detail-body">
                    <div class="listing-detail-image">
                        <img src="${r}" alt="${this.escapeHtml(e.title)}" onerror="this.src='/assets/images/placeholder.svg'">
                    </div>
                    <div class="listing-detail-info">
                        ${this.getListingInsightsMarkup(e,h)}
                        <p><strong>A\xE7\u0131klama:</strong></p>
                        <p>${this.escapeHtml(e.description||"A\xE7\u0131klama bulunamad\u0131.")}</p>
                        <div class="listing-actions">
                            <button class="btn ${l?"btn-primary":"btn-outline"}" data-action="favorite" data-listing-id="${n}"><i data-lucide="heart"></i> ${l?"Favorilerden \xC7\u0131kar":"Favorilere Ekle"}</button>
                            <button class="btn ${d?"btn-primary":"btn-outline"}" data-action="compare" data-listing-id="${n}"><i data-lucide="${d?"check":"columns-3"}"></i> ${d?"Kar\u015F\u0131la\u015Ft\u0131rmada":"Kar\u015F\u0131la\u015Ft\u0131r"}</button>
                            <a href="/karar-asistani" class="btn btn-outline"><i data-lucide="sparkles"></i> Asistanda analiz et</a>
                            <a href="${o}" target="_blank" rel="noopener noreferrer" class="btn btn-primary"><i data-lucide="external-link"></i> ${this.escapeHtml(u)}</a>
                        </div>
                    </div>
                </div>
                ${this.getListingDetailDecisionMarkup(a,e)}
            </div>
        `,this.loadIcons()}getListingDetailDecisionMarkup(e,t={}){if(!e)return"";const a={price:Math.max(Number(e.price||0),1),periodicCost:Math.max(Number(e.periodicCost||0),1),monthlyPayment:Math.max(Number(e.monthlyPayment||0),1)},s={channels:[{url:t.external_url||"https://www.sahibinden.com/"}]};return'<section class="listing-detail-decision"><div class="listing-detail-decision-head"><div><span class="assistant-kicker">AI ilan yorumu</span><h3>'+this.escapeHtml(e.riskLevel||"Karar analizi")+"</h3><p>"+this.escapeHtml(e.comment||"")+'</p></div><div class="listing-detail-score"><strong>'+this.escapeHtml(e.score||"-")+'</strong><span>/100</span></div></div><div class="comparison-metrics listing-detail-metrics"><div><span>Ana bedel</span><strong>'+this.formatPrice(e.price||0)+" \u20BA</strong></div><div><span>D\xF6nemsel maliyet</span><strong>"+this.formatPrice(e.periodicCost||0)+" \u20BA</strong></div><div><span>Ayl\u0131k \xF6deme</span><strong>"+this.formatPrice(e.monthlyPayment||0)+" \u20BA</strong></div><div><span>Toplam geri \xF6deme</span><strong>"+this.formatPrice(e.totalPayment||0)+" \u20BA</strong></div></div>"+this.getComparisonGraphMarkup(e,a)+(e.tags?.length?'<div class="comparison-tags">'+e.tags.map(i=>"<span>"+this.escapeHtml(i)+"</span>").join("")+"</div>":"")+this.getListingDetailRowsMarkup(e.calculationRows)+this.getRecommendationActionPlanMarkup(e.categoryId||t.category,s)+"</section>"}getListingDetailRowsMarkup(e=[]){return!Array.isArray(e)||!e.length?"":'<div class="listing-detail-rows">'+e.slice(0,6).map(t=>"<div><span>"+this.escapeHtml(t.label)+"</span><strong>"+this.formatPrice(t.value||0)+" \u20BA</strong><small>"+this.escapeHtml(t.note||"")+"</small></div>").join("")+"</div>"}renderFavorites(e){const t=document.getElementById("favorites-grid");if(t){if(!e.length){t.innerHTML=`
                <div class="empty-state">
                    <i data-lucide="heart"></i>
                    <h3>Hen\xFCz favori ilan yok</h3>
                    <p>Bir ilana g\xF6z at\u0131n ve kalp ikonuna basarak favorilerinize ekleyin.</p>
                </div>
            `;return}t.innerHTML=e.map(a=>`
            <div class="favorite-card">
                <div class="favorite-card-body">
                    <h4>${this.escapeHtml(a.title)}</h4>
                    <p>${this.escapeHtml(a.location||"Konum belirtilmemi\u015F")}</p>
                    <p class="listing-price">${this.formatPrice(a.price)} \u20BA</p>
                    <div class="listing-actions">
                        <button class="btn btn-outline" data-favorite-id="${this.escapeHtml(a.id)}"><i data-lucide="heart-off"></i> Kald\u0131r</button>
                        <button class="btn btn-outline" data-action="detail" data-listing-id="${this.escapeHtml(a.id)}"><i data-lucide="eye"></i> Detay</button>
                        <button class="btn btn-outline" data-action="compare" data-listing-id="${this.escapeHtml(a.id)}"><i data-lucide="columns-3"></i> Kar\u015F\u0131la\u015Ft\u0131r</button>
                        <a href="${this.safeExternalUrl(a.external_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary"><i data-lucide="external-link"></i> \u0130lan\u0131 G\xF6r</a>
                    </div>
                </div>
            </div>
        `).join(""),this.loadIcons()}}renderComparison(e=[]){const t=document.getElementById("comparison-content");if(!t)return;if(!Array.isArray(e)||!e.length){t.innerHTML='<div class="empty-state"><i data-lucide="columns-3"></i><h3>Kar\u015F\u0131la\u015Ft\u0131rma listesi bo\u015F</h3><p>Karar sonucu veya ilan kartlar\u0131ndan se\xE7enekleri kar\u015F\u0131la\u015Ft\u0131rmaya ekleyin.</p></div>',this.loadIcons();return}const a=e[0]?.categoryName||"Kar\u015F\u0131la\u015Ft\u0131rma",s={price:Math.max(...e.map(i=>Number(i.price||0)),1),periodicCost:Math.max(...e.map(i=>Number(i.periodicCost||0)),1),monthlyPayment:Math.max(...e.map(i=>Number(i.monthlyPayment||0)),1)};t.innerHTML='<div class="comparison-toolbar"><div><span class="assistant-kicker">'+this.escapeHtml(a)+"</span><h3>"+this.escapeHtml(e.length)+' se\xE7enek yan yana</h3><p>Fiyat, d\xF6nemsel maliyet, kredi y\xFCk\xFC, risk ve karar detaylar\u0131 ayn\u0131 tabloda okunur.</p></div><button type="button" class="btn btn-outline" data-comparison-clear><i data-lucide="trash-2"></i> Temizle</button></div><div class="comparison-grid">'+e.map(i=>this.getComparisonCardMarkup(i,s)).join("")+"</div>"+this.getComparisonMatrixMarkup(e),this.loadIcons()}getComparisonCardMarkup(e,t){const a=Array.isArray(e.tags)?e.tags:[];return'<article class="comparison-card"><div class="comparison-card-head"><div><span class="assistant-kicker">'+this.escapeHtml(e.sourceType||"Se\xE7enek")+"</span><h4>"+this.escapeHtml(e.title||"Kar\u015F\u0131la\u015Ft\u0131rma se\xE7ene\u011Fi")+'</h4></div><button type="button" class="icon-btn" title="Kar\u015F\u0131la\u015Ft\u0131rmadan \xE7\u0131kar" data-comparison-remove="'+this.escapeHtml(e.id)+'"><i data-lucide="x"></i></button></div><div class="comparison-score-row"><strong>'+this.escapeHtml(e.score||"-")+"</strong><span>AI karar skoru</span><em>"+this.escapeHtml(e.riskLevel||"Kontrol gerekli")+'</em></div><div class="comparison-metrics"><div><span>Ana bedel</span><strong>'+this.formatPrice(e.price||0)+" \u20BA</strong></div><div><span>D\xF6nemsel maliyet</span><strong>"+this.formatPrice(e.periodicCost||0)+" \u20BA</strong></div><div><span>Ayl\u0131k \xF6deme</span><strong>"+this.formatPrice(e.monthlyPayment||0)+" \u20BA</strong></div></div>"+this.getComparisonGraphMarkup(e,t)+(a.length?'<div class="comparison-tags">'+a.map(s=>"<span>"+this.escapeHtml(s)+"</span>").join("")+"</div>":"")+'<p class="comparison-comment">'+this.escapeHtml(e.comment||"Bu se\xE7enek fiyat, yan maliyet ve finansman etkisiyle de\u011Ferlendirildi.")+"</p></article>"}getComparisonGraphMarkup(e,t){return'<div class="comparison-mini-graph">'+[{label:"Fiyat",value:Number(e.price||0),max:t.price},{label:"Yan maliyet",value:Number(e.periodicCost||0),max:t.periodicCost},{label:"Ayl\u0131k kredi",value:Number(e.monthlyPayment||0),max:t.monthlyPayment}].map(s=>{const i=Math.max(4,Math.min(100,Math.round(s.value/Math.max(s.max,1)*100)));return'<div class="comparison-graph-row"><span>'+this.escapeHtml(s.label)+'</span><i><b style="width:'+this.escapeHtml(i)+'%"></b></i><strong>'+this.formatPrice(s.value)+" \u20BA</strong></div>"}).join("")+"</div>"}getComparisonMatrixMarkup(e=[]){const t=this.getComparisonMatrixRows(e);return'<section class="comparison-matrix"><div class="comparison-matrix-head"><div><span class="assistant-kicker">Detay matrisi</span><h3>Kategoriye \xF6zel karar tablosu</h3></div><p>Her s\xFCtun se\xE7ilen bir se\xE7enek, her sat\u0131r karar kalemidir.</p></div><div class="comparison-table-wrap"><table class="comparison-table"><thead><tr><th>Kriter</th>'+e.map(a=>"<th>"+this.escapeHtml(a.title||"Se\xE7enek")+"</th>").join("")+"</tr></thead><tbody>"+t.map(a=>"<tr><td>"+this.escapeHtml(a.label)+"</td>"+e.map(s=>"<td>"+this.escapeHtml(a.get(s))+"</td>").join("")+"</tr>").join("")+"</tbody></table></div></section>"}getComparisonMatrixRows(e=[]){const t=n=>Number(n||0)>0?this.formatPrice(n)+" \u20BA":"-",a=[{label:"Kaynak",get:n=>n.sourceType||"-"},{label:"AI skoru",get:n=>n.score?n.score+"/100":"-"},{label:"Risk",get:n=>n.riskLevel||"-"},{label:"Ana bedel",get:n=>t(n.price)},{label:"D\xF6nemsel maliyet",get:n=>t(n.periodicCost)},{label:"Ayl\u0131k \xF6deme",get:n=>t(n.monthlyPayment)},{label:"Toplam geri \xF6deme",get:n=>t(n.totalPayment)}];return[...new Set(e.flatMap(n=>(n.details||[]).map(r=>r.label)))].slice(0,6).forEach(n=>{a.push({label:n,get:r=>(r.details||[]).find(o=>o.label===n)?.value||"-"})}),[...new Set(e.flatMap(n=>(n.calculationRows||[]).map(r=>r.label)))].slice(0,10).forEach(n=>{a.push({label:n,get:r=>{const o=(r.calculationRows||[]).find(l=>l.label===n);return o?t(o.value):"-"}})}),a}renderAdminDashboard(e,t,a,s={},i={}){const n=document.querySelector("#admin .admin-card");if(!n)return;const r=Array.isArray(s.sourceRegistry)?s.sourceRegistry:[],o=i.updatedAt?new Date(i.updatedAt).toLocaleString("tr-TR"):"Hen\xFCz yok";n.innerHTML=`
            <div class="admin-dashboard">
                <div class="admin-stat-grid">
                    <div class="admin-stat"><strong>${this.escapeHtml(a.categories)}</strong><span>Kategori</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(a.questions)}</strong><span>Soru</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(a.options)}</strong><span>\xD6neri se\xE7ene\u011Fi</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(a.financeProducts)}</strong><span>Kredi \xFCr\xFCn\xFC</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(a.provinces)}</strong><span>\u0130l</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(a.districts)}</strong><span>\u0130l\xE7e</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(a.carModels)}</strong><span>Marka/model</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(a.vacationPlaces)}</strong><span>Tatil yeri</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(a.decisions)}</strong><span>Kaydedilen karar</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(a.dataSources||0)}</strong><span>Veri kayna\u011F\u0131</span></div>
                </div>
                <section class="admin-data-center">
                    <div class="admin-data-heading">
                        <div>
                            <span class="assistant-kicker">Veri merkezi</span>
                            <h3>Pazaryeri \xF6l\xE7e\u011Fi i\xE7in kaynak ve fiyat altyap\u0131s\u0131</h3>
                            <p>${this.escapeHtml(s.integrations?.note||"D\u0131\u015F veri kaynaklar\u0131 y\xF6netilebilir hale getirildi.")}</p>
                        </div>
                        <div class="admin-data-actions">
                            <button type="button" class="btn btn-outline" data-admin-market-action="refresh"><i data-lucide="refresh-cw"></i> Yenile</button>
                            <button type="button" class="btn btn-outline" data-admin-market-action="export"><i data-lucide="download"></i> D\u0131\u015Fa aktar</button>
                            <button type="button" class="btn btn-primary" data-admin-market-action="reset"><i data-lucide="database"></i> Varsay\u0131lan\u0131 y\xFCkle</button>
                        </div>
                    </div>
                    <div class="admin-panel-meta">
                        <span>${this.escapeHtml(i.readySources||0)} haz\u0131r kaynak</span>
                        <span>${this.escapeHtml(i.financeSources||0)} finans kayna\u011F\u0131</span>
                        <span>${i.liveProvidersEnabled?"Canl\u0131 sa\u011Flay\u0131c\u0131 a\xE7\u0131k":"Canl\u0131 sa\u011Flay\u0131c\u0131 bekliyor"}</span>
                        <span>G\xFCncelleme: ${this.escapeHtml(o)}</span>
                    </div>
                    <div class="admin-source-grid">
                        ${r.map(l=>`
                            <a class="admin-source-card" href="${this.safeExternalUrl(l.url)}" target="_blank" rel="noopener noreferrer">
                                <span>${this.escapeHtml(l.category)}</span>
                                <strong>${this.escapeHtml(l.name)}</strong>
                                <small>${this.escapeHtml(l.type)} \xB7 ${this.escapeHtml(l.mode)} \xB7 ${this.escapeHtml(l.status)}</small>
                            </a>
                        `).join("")}
                    </div>
                </section>
                ${this.getAdminMarketEditorMarkup(t,s)}
                <div class="admin-grid">
                    ${Object.entries(e).map(([l,d])=>`
                        <article class="admin-panel-card">
                            <div class="admin-panel-heading">
                                <i data-lucide="${this.escapeHtml(d.icon)}"></i>
                                <div>
                                    <h3>${this.escapeHtml(d.name)}</h3>
                                    <p>${this.escapeHtml(d.description)}</p>
                                </div>
                            </div>
                            <div class="admin-panel-meta">
                                <span>${this.escapeHtml(d.questions.length)} soru</span>
                                <span>${this.escapeHtml(d.options.length)} \xF6neri</span>
                                <span>${this.escapeHtml((t[l]||[]).length)} kredi \xFCr\xFCn\xFC</span>
                            </div>
                            <div class="admin-finance-list">
                                ${(t[l]||[]).map(c=>`
                                    <div>
                                        <strong>${this.escapeHtml(c.bank)}</strong>
                                        <span>%${this.escapeHtml(c.rate)} ayl\u0131k, ${this.escapeHtml(c.term)} ay, kredi oran\u0131 %${this.escapeHtml(Math.round(c.ratio*100))}</span>
                                    </div>
                                `).join("")}
                            </div>
                        </article>
                    `).join("")}
                </div>
            </div>
        `,this.loadIcons()}getAdminMarketEditorMarkup(e,t={}){return`
            <form class="admin-editor-form" data-admin-market-form="market-data">
                <div class="admin-editor-head">
                    <div>
                        <span class="assistant-kicker">Y\xF6netilebilir veri</span>
                        <h3>Kredi, maliyet ve kaynak ayarlar\u0131</h3>
                    </div>
                    <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> De\u011Fi\u015Fiklikleri kaydet</button>
                </div>
                ${this.getAdminFinanceEditorMarkup(e)}
                ${this.getAdminCostEditorMarkup(t.costProfiles||{})}
                ${this.getAdminSourceEditorMarkup(t.sourceRegistry||[])}
            </form>
        `}getAdminFinanceEditorMarkup(e={}){return`
            <section class="admin-editor-section">
                <div class="admin-editor-section-head">
                    <h4>Kredi \xFCr\xFCnleri</h4>
                    <p>Banka ad\u0131, ayl\u0131k oran, vade ve kullan\u0131lacak kredi oran\u0131 karar sonucundaki \xF6deme hesaplar\u0131n\u0131 do\u011Frudan etkiler.</p>
                </div>
                <div class="admin-editor-grid">
                    ${Object.entries(e).map(([t,a])=>`
                        <div class="admin-editor-card">
                            <h5>${this.escapeHtml(this.getCategoryLabel(t))}</h5>
                            ${(a||[]).map((s,i)=>`
                                <div class="admin-market-row">
                                    <input type="hidden" name="finance:${this.escapeHtml(t)}:${this.escapeHtml(i)}:id" value="${this.escapeHtml(s.id)}">
                                    <label>Banka
                                        <input name="finance:${this.escapeHtml(t)}:${this.escapeHtml(i)}:bank" value="${this.escapeHtml(s.bank)}" required>
                                    </label>
                                    <label>T\xFCr
                                        <input name="finance:${this.escapeHtml(t)}:${this.escapeHtml(i)}:type" value="${this.escapeHtml(s.type)}" required>
                                    </label>
                                    <label>Ayl\u0131k oran (%)
                                        <input type="number" step="0.01" min="0" name="finance:${this.escapeHtml(t)}:${this.escapeHtml(i)}:rate" value="${this.escapeHtml(s.rate)}" required>
                                    </label>
                                    <label>Vade (ay)
                                        <input type="number" step="1" min="1" name="finance:${this.escapeHtml(t)}:${this.escapeHtml(i)}:term" value="${this.escapeHtml(s.term)}" required>
                                    </label>
                                    <label>Kredi oran\u0131 (0-1)
                                        <input type="number" step="0.01" min="0" max="1" name="finance:${this.escapeHtml(t)}:${this.escapeHtml(i)}:ratio" value="${this.escapeHtml(s.ratio)}" required>
                                    </label>
                                </div>
                            `).join("")}
                        </div>
                    `).join("")}
                </div>
            </section>
        `}getAdminCostEditorMarkup(e={}){return`
            <section class="admin-editor-section">
                <div class="admin-editor-section-head">
                    <h4>Maliyet katsay\u0131lar\u0131</h4>
                    <p>Yak\u0131t, kasko, bak\u0131m, emlak ve tatil maliyetleri bu katsay\u0131lardan \xFCretilir.</p>
                </div>
                <div class="admin-editor-grid">
                    ${Object.entries(e).map(([t,a])=>`
                        <div class="admin-editor-card">
                            <h5>${this.escapeHtml(this.getCategoryLabel(t))}</h5>
                            <div class="admin-cost-grid">
                                ${Object.entries(a||{}).map(([s,i])=>`
                                    <label>${this.escapeHtml(this.getCostProfileLabel(s))}
                                        <input type="number" step="${this.escapeHtml(this.getMarketNumberStep(s))}" min="0" name="cost:${this.escapeHtml(t)}:${this.escapeHtml(s)}" value="${this.escapeHtml(i)}" required>
                                    </label>
                                `).join("")}
                            </div>
                        </div>
                    `).join("")}
                </div>
            </section>
        `}getAdminSourceEditorMarkup(e=[]){return`
            <section class="admin-editor-section">
                <div class="admin-editor-section-head">
                    <h4>Kaynak kay\u0131tlar\u0131</h4>
                    <p>D\u0131\u015F kaynak ad\u0131, URL ve durum bilgisi admin taraf\u0131ndan y\xF6netilir. Canl\u0131 API ba\u011Fland\u0131\u011F\u0131nda bu kay\u0131tlar sa\u011Flay\u0131c\u0131 ayarlar\u0131na d\xF6n\xFC\u015Fecek.</p>
                </div>
                <div class="admin-source-editor-grid">
                    ${e.map((t,a)=>`
                        <div class="admin-editor-card">
                            <div class="admin-source-editor-head">
                                <strong>${this.escapeHtml(t.name)}</strong>
                                <span>${this.escapeHtml(t.category)}</span>
                            </div>
                            <input type="hidden" name="source:${this.escapeHtml(a)}:id" value="${this.escapeHtml(t.id)}">
                            <input type="hidden" name="source:${this.escapeHtml(a)}:category" value="${this.escapeHtml(t.category)}">
                            <input type="hidden" name="source:${this.escapeHtml(a)}:type" value="${this.escapeHtml(t.type)}">
                            <input type="hidden" name="source:${this.escapeHtml(a)}:mode" value="${this.escapeHtml(t.mode)}">
                            <input type="hidden" name="source:${this.escapeHtml(a)}:cadence" value="${this.escapeHtml(t.cadence)}">
                            <label>Kaynak ad\u0131
                                <input name="source:${this.escapeHtml(a)}:name" value="${this.escapeHtml(t.name)}" required>
                            </label>
                            <label>URL
                                <input type="url" name="source:${this.escapeHtml(a)}:url" value="${this.escapeHtml(t.url)}" required>
                            </label>
                            <label>Durum
                                <select name="source:${this.escapeHtml(a)}:status">
                                    <option value="ready" ${t.status==="ready"?"selected":""}>Haz\u0131r</option>
                                    <option value="pending" ${t.status==="pending"?"selected":""}>Bekliyor</option>
                                    <option value="disabled" ${t.status==="disabled"?"selected":""}>Kapal\u0131</option>
                                </select>
                            </label>
                        </div>
                    `).join("")}
                </div>
            </section>
        `}getCategoryLabel(e){return{arac:"Ara\xE7",ev:"Ev",tatil:"Tatil"}[e]||e}getMarketNumberStep(e){return/Rate|Ratio/i.test(e)?"0.0001":/Multiplier/i.test(e)?"0.01":"1000"}getCostProfileLabel(e){return{basePrice:"Baz ara\xE7 fiyat\u0131",modelStep:"Model fiyat ad\u0131m\u0131",premiumPriceExtra:"Premium fiyat ek katsay\u0131s\u0131",electricPriceExtra:"Elektrikli fiyat ek katsay\u0131s\u0131",suvPriceExtra:"SUV fiyat ek katsay\u0131s\u0131",electricEnergyCost:"Elektrik enerji/y\u0131l",hybridFuelCost:"Hibrit yak\u0131t/y\u0131l",dieselFuelCost:"Dizel yak\u0131t/y\u0131l",gasolineFuelCost:"Benzin yak\u0131t/y\u0131l",insuranceStandardRate:"Standart kasko oran\u0131",insurancePremiumRate:"Premium kasko oran\u0131",trafficInsuranceBase:"Trafik sigortas\u0131 baz",trafficInsurancePremiumExtra:"Premium trafik ek",maintenanceElectric:"Elektrikli bak\u0131m",maintenanceStandard:"Standart bak\u0131m",maintenancePremium:"Premium bak\u0131m",metroBasePrice:"B\xFCy\xFCk\u015Fehir baz fiyat",standardBasePrice:"Standart il baz fiyat",yazlikMultiplier:"Yazl\u0131k \xE7arpan\u0131",mustakilMultiplier:"M\xFCstakil \xE7arpan\u0131",villaMultiplier:"Villa \xE7arpan\u0131",indexStep:"Alternatif fiyat ad\u0131m\u0131",apartmentDues:"Daire aidat/y\u0131l",detachedMaintenance:"M\xFCstakil bak\u0131m/y\u0131l",villaMaintenance:"Villa bak\u0131m/y\u0131l",insuranceRate:"Konut sigorta oran\u0131",propertyTaxRate:"Emlak vergisi oran\u0131",apartmentRenewal:"Daire yenileme pay\u0131",houseRenewal:"Ev/villa yenileme pay\u0131",familyBasePrice:"Aile tatili baz",luxuryBasePrice:"L\xFCks tatil baz",natureBasePrice:"Do\u011Fa tatili baz",cultureBasePrice:"K\xFClt\xFCr tatili baz",placeStep:"Tatil yeri fiyat ad\u0131m\u0131",accommodationRatio:"Konaklama oran\u0131",transportRatio:"Ula\u015F\u0131m oran\u0131",activityRatio:"Aktivite oran\u0131",insuranceRatio:"Seyahat sigortas\u0131 oran\u0131"}[e]||e}renderQuiz(e){const t=document.getElementById("quiz-content");if(t){if(!e.length){t.innerHTML=`
                <div class="empty-state">
                    <i data-lucide="help-circle"></i>
                    <h3>Hen\xFCz soru yok</h3>
                    <p>Quiz sorular\u0131 eklendi\u011Finde burada g\xF6r\xFCnecek.</p>
                </div>
            `,this.loadIcons();return}t.innerHTML=e.map(a=>{const s=this.normalizeQuizOptions(a.options);return`
                <article class="quiz-question" data-question-id="${this.escapeHtml(a.id)}">
                    <div class="quiz-question-header">
                        <span>${this.escapeHtml(a.category||"Genel")}</span>
                        <strong>${this.escapeHtml(a.difficulty||"medium")}</strong>
                    </div>
                    <h3>${this.escapeHtml(a.question)}</h3>
                    <div class="quiz-options">
                        ${s.map((i,n)=>`
                            <button type="button" class="quiz-option" data-question-id="${this.escapeHtml(a.id)}" data-quiz-answer="${n}">
                                ${this.escapeHtml(i)}
                            </button>
                        `).join("")}
                    </div>
                </article>
            `}).join("")}}markQuizAnswer(e,t,a){const s=document.querySelector(`[data-question-id="${CSS.escape(e)}"]`);s&&s.querySelectorAll(".quiz-option").forEach(i=>{i.disabled=!0,Number(i.dataset.quizAnswer)===Number(t)&&i.classList.add(a?"is-correct":"is-wrong")})}normalizeQuizOptions(e){if(Array.isArray(e))return e;if(typeof e=="string")try{const t=JSON.parse(e);return Array.isArray(t)?t:[]}catch{return[]}return[]}showLoading(e){const t=document.querySelector(e);t&&(t.innerHTML=`
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Y\xFCkleniyor...</p>
                </div>
            `)}hideLoading(e){}showError(e){this.showNotification(e,"error")}showSuccess(e){this.showNotification(e,"success")}showNotification(e,t="info"){const a=document.createElement("div");a.className=`notification ${t}`,a.setAttribute("role",t==="error"?"alert":"status"),a.setAttribute("aria-live",t==="error"?"assertive":"polite");const s=document.createElement("span");s.textContent=e;const i=document.createElement("button");i.className="notification-close",i.type="button",i.setAttribute("aria-label","Bildirimi kapat"),i.innerHTML="&times;",a.append(s,i),document.body.appendChild(a),setTimeout(()=>{a.parentNode&&a.remove()},5e3),i.addEventListener("click",()=>{a.remove()})}closeAllModals(){document.querySelectorAll(".modal.show").forEach(e=>{e.classList.remove("show")}),v.setModal(null)}showHelpModal(){const e=document.createElement("div");e.className="modal show",e.innerHTML=`
            <div class="modal-content">
                <div class="modal-header">
                    <h3>K\u0131sayollar</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="shortcuts">
                        <div class="shortcut">
                            <kbd>Ctrl+K</kbd>
                            <span>Arama kutusuna odaklan</span>
                        </div>
                        <div class="shortcut">
                            <kbd>Ctrl+/</kbd>
                            <span>Yard\u0131m men\xFCs\xFCn\xFC a\xE7</span>
                        </div>
                        <div class="shortcut">
                            <kbd>Esc</kbd>
                            <span>A\xE7\u0131k modal pencereyi kapat</span>
                        </div>
                    </div>
                </div>
            </div>
        `,document.body.appendChild(e),e.querySelector(".modal-close").addEventListener("click",()=>{e.remove()}),e.addEventListener("click",t=>{t.target===e&&e.remove()})}escapeHtml(e){return b(e)}safeImageUrl(e){return f(e)}safeExternalUrl(e){return H(e)}formatPrice(e){return new Intl.NumberFormat("tr-TR").format(e)}formatDate(e){const t=new Date(e),s=new Date-t,i=Math.floor(s/6e4),n=Math.floor(s/36e5),r=Math.floor(s/864e5);return i<1?"\u015Eimdi":i<60?`${i} dakika \xF6nce`:n<24?`${n} saat \xF6nce`:r<7?`${r} g\xFCn \xF6nce`:t.toLocaleDateString("tr-TR")}scrollToElement(e){const t=document.querySelector(e);t&&t.scrollIntoView({behavior:"smooth"})}setPageTitle(e){document.title=e}showMessaging(e){(document.getElementById("messaging-modal")||this.createMessagingModal()).classList.add("show"),v.setModal("messaging")}createMessagingModal(){const e=document.createElement("div");return e.id="messaging-modal",e.className="modal",e.innerHTML=`
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Mesajlar</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="messages-list" class="messages-list"></div>
                    <form id="message-form" class="message-form">
                        <input type="text" name="content" placeholder="Mesaj\u0131n\u0131z\u0131 yaz\u0131n..." required>
                        <button type="submit" class="btn btn-primary">G\xF6nder</button>
                    </form>
                </div>
            </div>
        `,document.body.appendChild(e),e.querySelector(".modal-close").addEventListener("click",()=>{e.classList.remove("show"),v.setModal(null)}),e}renderMessages(e,t){const a=document.getElementById("messages-list");a&&(a.innerHTML=e.map(s=>`
            <div class="message ${s.sender_id===t?"sent":"received"}">
                <div class="message-content">${this.escapeHtmlValue(s.content)}</div>
                <div class="message-time">${new Date(s.created_at).toLocaleTimeString()}</div>
            </div>
        `).join(""),a.scrollTop=a.scrollHeight)}}export default UIManager;
