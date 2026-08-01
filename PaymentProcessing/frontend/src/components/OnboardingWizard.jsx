import { useState, useEffect } from 'react';
import { FiCheckCircle, FiLock, FiLogIn, FiShield, FiUser } from 'react-icons/fi';
import { apiRequest } from '../services/api';
import './OnboardingWizard.css';

const steps=['Welcome','Sign up','Profile','Link account','Verify','Set TPIN','Complete'];
const initial={email:'',password:'',confirmPassword:'',firstName:'',lastName:'',phoneNumber:'',bankName:'',accountNumber:'',accountHolderName:'',otp:'',tpin:'',confirmTpin:''};

const isStrongPassword=(pw)=>
  pw.length>=8&&/[A-Z]/.test(pw)&&/[a-z]/.test(pw)&&/[0-9]/.test(pw)&&/[^A-Za-z0-9]/.test(pw);

export default function OnboardingWizard({onLogin}){
 const [mode,setMode]=useState('onboarding'),[step,setStep]=useState(0),[form,setForm]=useState(initial),[customerId,setCustomerId]=useState(null),[developmentOtp,setDevelopmentOtp]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[banks,setBanks]=useState([]),[simulated,setSimulated]=useState(null),[generating,setGenerating]=useState(false);

 useEffect(()=>{ apiRequest('/accounts/banks').then(setBanks).catch(()=>{}); },[]);

 const change=e=>{setForm(v=>({...v,[e.target.name]:e.target.value}));if(e.target.name==='bankName')setSimulated(null);};

 const generateDetails=async()=>{
   if(!form.bankName||!form.accountHolderName)return;
   setGenerating(true);setError('');
   try{const r=await apiRequest(`/accounts/simulate/${form.bankName}`);setSimulated(r);setForm(v=>({...v,accountNumber:r.accountNumber}));}
   catch(err){setError(err.message||'Failed to generate account details.');}
   finally{setGenerating(false);}
 };

 const skipAccount=async()=>{
   if(!customerId)return;
   setBusy(true);setError('');
   try{await apiRequest(`/onboarding/${customerId}/complete`,{method:'POST'});setStep(6);}
   catch(err){setError(err.message||'Please try again.');}
   finally{setBusy(false);}
 };

 const submit=async e=>{e.preventDefault();setError('');setBusy(true);try{
   if(mode==='login'){onLogin(await apiRequest('/onboarding/login',{method:'POST',body:JSON.stringify(form)}));return}
   if(step===0){setStep(1);return}
   if(step===1){
     if(form.password!==form.confirmPassword)throw new Error('Passwords do not match.');
     if(!isStrongPassword(form.password))throw new Error('Password must be 8+ characters with uppercase, lowercase, number and special character.');
     const r=await apiRequest('/onboarding/signup',{method:'POST',body:JSON.stringify(form)});setCustomerId(r.customerId);setStep(2);return
   }
   if(step===2){await apiRequest(`/onboarding/${customerId}/profile`,{method:'PUT',body:JSON.stringify(form)});setStep(3);return}
   if(step===3){if(!simulated)throw new Error('Please generate account details first.');const r=await apiRequest(`/onboarding/${customerId}/link-account`,{method:'POST',body:JSON.stringify({...form,balance:simulated.balance,currency:simulated.currency,ifsc_code:simulated.ifscCode})});setDevelopmentOtp(r.developmentOtp||'');setStep(4);return}
   if(step===4){await apiRequest(`/onboarding/${customerId}/verify`,{method:'POST',body:JSON.stringify({otp:form.otp})});setStep(5);return}
   if(step===5){if(form.tpin!==form.confirmTpin)throw new Error('TPIN entries do not match.');await apiRequest(`/onboarding/${customerId}/set-tpin`,{method:'POST',body:JSON.stringify({tpin:form.tpin})});setStep(6);return}
   setMode('login')
 }catch(err){setError(err.message||'Please try again.')}finally{setBusy(false)}};

 const fields=mode==='login'?[['email','Email address','email'],['password','Password','password']]:step===1?[['email','Email address','email'],['password','Password (8+ chars, upper, lower, number, special)','password'],['confirmPassword','Confirm password','password']]:step===2?[['firstName','First name'],['lastName','Last name'],['phoneNumber','Phone number']]:step===4?[['otp','6-digit verification code']]:step===5?[['tpin','6-digit TPIN','password'],['confirmTpin','Confirm TPIN','password']]:[];
 const title=mode==='login'?'Welcome back':steps[step]; const description=mode==='login'?'Log in to access your Tallyn dashboard.':step===1?'Create your secure Tallyn account.':step===3?'Link a bank account or skip and add one later.':step===6?'Your account is ready. Sign in to continue.':'Complete this secure step to continue.';
 return <main className="onboarding-shell"><section className="onboarding-brand"><div className="onboarding-logo">T</div><h1>Tallyn</h1><p>Simple, secure payments made personal.</p><ol>{steps.map((s,i)=><li key={s} className={mode==='onboarding'&&i<=step?'done':''}>{i<step?<FiCheckCircle/>:<span>{i+1}</span>}{s}</li>)}</ol></section><section className="onboarding-card"><div className="onboarding-icon">{mode==='login'?<FiLogIn/>:step===6?<FiCheckCircle/>:step===5?<FiLock/>:<FiUser/>}</div><h2>{title}</h2><p>{description}</p><form onSubmit={submit}>
 {mode==='onboarding'&&step===3?(
   <>
     <label>Bank name
       <select name="bankName" value={form.bankName} onChange={change}>
         <option value="">Select a bank</option>
         {banks.map(b=><option key={b} value={b}>{b}</option>)}
       </select>
     </label>
     <label>Account holder name<input name="accountHolderName" type="text" value={form.accountHolderName} onChange={change}/></label>
     <button type="button" onClick={generateDetails} disabled={!form.bankName||!form.accountHolderName||generating} className="onboarding-link">{generating?'Generating…':'Generate Account Details'}</button>
     {simulated&&<>
       <label>Account number<input value={simulated.accountNumber} readOnly/></label>
       <label>IFSC code<input value={simulated.ifscCode} readOnly/></label>
     </>}
   </>
 ):(
   <>
     {fields.map(([name,placeholder,type])=><label key={name}>{placeholder}<input name={name} type={type||'text'} inputMode={name==='otp'||name.includes('tpin')?'numeric':undefined} value={form[name]} onChange={change} required/></label>)}
     {step===4&&developmentOtp&&<small className="dev-otp">Development code: <strong>{developmentOtp}</strong></small>}
     {step===6&&<div className="complete-note"><FiShield/> Registration complete.</div>}
   </>
 )}
 {error&&<p className="onboarding-error">{error}</p>}
 <button disabled={busy}>{busy?'Please wait…':mode==='login'?'Log in':step===6?'Go to login':step===0?'Get started':'Continue'}</button>
 </form>
 {mode==='onboarding'&&step===3&&<button className="onboarding-link" onClick={skipAccount} disabled={busy}>Skip for now — add account later</button>}
 {(mode!=='onboarding'||step===3)?null:<span/>}
 <button className="onboarding-link" onClick={()=>{setMode(mode==='login'?'onboarding':'login');setStep(0)}}>{mode==='login'?'Create an account':'Already have an account? Log in'}</button></section></main>;
}
