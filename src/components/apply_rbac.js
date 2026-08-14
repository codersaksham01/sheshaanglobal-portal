const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/sakshxmsingh/Desktop/uday/Sana Zeba Project/Crixy/upgrade demo/portal by gemioni/src/components/Dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Add currentRole to BuyerCardProps interface
const propsTarget = `interface BuyerCardProps {
  client: Client;
  country: string;
  phone: string;
  metrics: {
    quotesCount: number;
    receivableValue: number;
    shipmentsCount: number;
    openTasksCount: number;
    lastActivityTitle: string;
  };
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatQuoteCurrency: (val: number, cur: 'INR' | 'USD') => string;
  bestSendWindowIST: (country: string) => string;
  crmLead?: Lead;
  onPushToCrm?: () => void;
}`;

const propsReplacement = `interface BuyerCardProps {
  client: Client;
  country: string;
  phone: string;
  metrics: {
    quotesCount: number;
    receivableValue: number;
    shipmentsCount: number;
    openTasksCount: number;
    lastActivityTitle: string;
  };
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatQuoteCurrency: (val: number, cur: 'INR' | 'USD') => string;
  bestSendWindowIST: (country: string) => string;
  crmLead?: Lead;
  onPushToCrm?: () => void;
  currentRole?: string;
}`;

if (content.includes(propsTarget)) {
  content = content.replace(propsTarget, propsReplacement);
  console.log('BuyerCardProps updated successfully.');
} else {
  console.log('Error: Could not locate BuyerCardProps.');
}

// 2. Destructure currentRole inside BuyerCard component argument list
const buyerCardTarget = `const BuyerCard: React.FC<BuyerCardProps> = React.memo(({
  client,
  country,
  phone,
  metrics,
  onView,
  onEdit,
  onDelete,
  formatQuoteCurrency,
  bestSendWindowIST,
  crmLead,
  onPushToCrm
}) => {`;

const buyerCardReplacement = `const BuyerCard: React.FC<BuyerCardProps> = React.memo(({
  client,
  country,
  phone,
  metrics,
  onView,
  onEdit,
  onDelete,
  formatQuoteCurrency,
  bestSendWindowIST,
  crmLead,
  onPushToCrm,
  currentRole = 'Admin'
}) => {`;

if (content.includes(buyerCardTarget)) {
  content = content.replace(buyerCardTarget, buyerCardReplacement);
  console.log('BuyerCard component signature updated successfully.');
} else {
  console.log('Error: Could not locate BuyerCard component signature.');
}

// 3. Update all <RowActions /> usages inside Dashboard.tsx to pass currentRole={currentRole}
// Note: We can replace `<RowActions ` with `<RowActions currentRole={currentRole} `
// We must check if it's already updated.
const rowActionsCountBefore = (content.match(/<RowActions /g) || []).length;
content = content.replace(/<RowActions /g, '<RowActions currentRole={currentRole} ');
const rowActionsCountAfter = (content.match(/<RowActions /g) || []).length;
console.log(`Updated ${rowActionsCountAfter} RowActions tags with currentRole.`);

// 4. Pass currentRole={currentRole} to BuyerCard inside Dashboard.tsx render loops
const buyerCardRender = `                      <BuyerCard
                        key={buyer.id}
                        buyer={buyer}
                        client={buyer}
                        country={country}
                        phone={phone}
                        metrics={metrics}
                        crmLead={linkedLead}
                        onView={() => setSelectedBuyerId(buyer.id)}
                        onEdit={() => openBuyerAsCrmLead(buyer)}
                        onDelete={() => deleteClient(buyer.id)}
                        formatQuoteCurrency={formatQuoteCurrency}
                        bestSendWindowIST={bestSendWindowIST}
                        onPushToCrm={() => handlePushBuyerToCrm(buyer)}
                      />`;

const buyerCardRenderReplacement = `                      <BuyerCard
                        key={buyer.id}
                        buyer={buyer}
                        client={buyer}
                        country={country}
                        phone={phone}
                        metrics={metrics}
                        crmLead={linkedLead}
                        onView={() => setSelectedBuyerId(buyer.id)}
                        onEdit={() => openBuyerAsCrmLead(buyer)}
                        onDelete={() => deleteClient(buyer.id)}
                        formatQuoteCurrency={formatQuoteCurrency}
                        bestSendWindowIST={bestSendWindowIST}
                        onPushToCrm={() => handlePushBuyerToCrm(buyer)}
                        currentRole={currentRole}
                      />`;

if (content.includes(buyerCardRender)) {
  content = content.replace(buyerCardRender, buyerCardRenderReplacement);
  console.log('BuyerCard render block 1 updated with currentRole.');
}

// Check other BuyerCard rendering loops
const buyerCardRender2 = `                    <BuyerCard
                      key={buyer.id}
                      buyer={buyer}
                      client={buyer}
                      country={country}
                      phone={phone}
                      metrics={metrics}
                      crmLead={linkedLead}
                      onView={() => setSelectedBuyerId(buyer.id)}
                      onEdit={() => {
                        setClientForm(buyer);
                        setEditingClientId(buyer.id);
                      }}
                      onDelete={() => deleteClient(buyer.id)}
                      formatQuoteCurrency={formatQuoteCurrency}
                      bestSendWindowIST={bestSendWindowIST}
                      onPushToCrm={() => handlePushBuyerToCrm(buyer)}
                    />`;

const buyerCardRender2Replacement = `                    <BuyerCard
                      key={buyer.id}
                      buyer={buyer}
                      client={buyer}
                      country={country}
                      phone={phone}
                      metrics={metrics}
                      crmLead={linkedLead}
                      onView={() => setSelectedBuyerId(buyer.id)}
                      onEdit={() => {
                        setClientForm(buyer);
                        setEditingClientId(buyer.id);
                      }}
                      onDelete={() => deleteClient(buyer.id)}
                      formatQuoteCurrency={formatQuoteCurrency}
                      bestSendWindowIST={bestSendWindowIST}
                      onPushToCrm={() => handlePushBuyerToCrm(buyer)}
                      currentRole={currentRole}
                    />`;

if (content.includes(buyerCardRender2)) {
  content = content.replace(buyerCardRender2, buyerCardRender2Replacement);
  console.log('BuyerCard render block 2 updated with currentRole.');
}

// 5. Secure quotes delete action inside Dashboard.tsx (q.id check)
const quoteDeleteBtn = `<button onClick={() => handleDeleteQuote(q.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition" title="Delete Deal">`;
const quoteDeleteBtnReplacement = `{currentRole === 'Admin' && (
                                <button onClick={() => handleDeleteQuote(q.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition" title="Delete Deal">`;

// Find where quotes table ends to close the tag if we wrap it, or just disable it:
// Let's replace the button itself to be disabled if not admin:
const quoteDeleteBtnDisabled = `<button onClick={() => handleDeleteQuote(q.id)} disabled={currentRole !== 'Admin'} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition disabled:opacity-40 disabled:hover:bg-transparent" title={currentRole === 'Admin' ? "Delete Deal" : "Only Admins can delete"}>`;

if (content.includes(quoteDeleteBtn)) {
  content = content.replace(quoteDeleteBtn, quoteDeleteBtnDisabled);
  console.log('Quote delete button secured successfully.');
} else {
  console.log('Error: Could not locate quote delete button.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('apply_rbac.js completed.');
