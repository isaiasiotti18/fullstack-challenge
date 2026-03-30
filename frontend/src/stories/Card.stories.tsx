import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80 border-border-game bg-bg-card">
      <CardHeader>
        <CardTitle className="text-text-primary">Apostas da Rodada</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">3 apostas ativas</p>
      </CardContent>
    </Card>
  ),
};

export const GameInfo: Story = {
  render: () => (
    <Card className="w-80 border-border-game bg-bg-card">
      <CardContent className="space-y-2 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Crash Point:</span>
          <span className="font-mono font-bold text-red-400">2.47x</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Total Apostas:</span>
          <span className="font-mono text-text-primary">R$ 150,00</span>
        </div>
      </CardContent>
    </Card>
  ),
};
