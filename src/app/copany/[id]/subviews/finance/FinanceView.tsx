import SecondaryTabViewView from "@/components/commons/SecondaryTabView";
import DistributeView from "./DistributeView";
import TransactionsView from "./TransactionsView";

export default function FinanceView({ copanyId }: { copanyId: string }) {
  return (
    <SecondaryTabViewView
      tabs={[
        {
          label: "Distribute",
          content: <DistributeView copanyId={copanyId} />,
        },
        {
          label: "Transactions",
          content: <TransactionsView copanyId={copanyId} />,
        },
      ]}
      urlParamName="financeTab"
    />
  );
}
