import SecondaryTabViewView from "@/components/commons/SecondaryTabView";
import DistributeView from "./DistributeView";
import TransactionsView from "./TransactionsView";
import AppStoreConnectView from "./AppStoreConnectView";

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
        {
          label: "App Store Connect",
          content: <AppStoreConnectView copanyId={copanyId} />,
        },
      ]}
      urlParamName="financeTab"
    />
  );
}
