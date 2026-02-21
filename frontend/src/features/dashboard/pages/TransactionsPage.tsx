// TransactionPage.tsx continue

import type { ReactNode } from 'react'

type TransactionsProps = {
  children: ReactNode;
};

export default function Transactions({ children }: TransactionsProps) {
  return(
    <div> 
      <h1>Transactions</h1>
      <title>Transactions</title>
      <button onClick={() => console.log("Transaction button clicked")}>
        Create Transaction 
      </button>
      {children}

    </div>
     
  );
}
