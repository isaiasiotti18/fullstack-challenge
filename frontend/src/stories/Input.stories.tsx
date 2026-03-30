import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/components/ui/input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: "Valor da aposta",
    type: "number",
  },
};

export const BetAmount: Story = {
  render: () => (
    <div className="w-60">
      <label className="mb-1 block text-sm text-text-secondary">Valor (R$)</label>
      <Input
        type="number"
        min={1}
        max={1000}
        defaultValue="10.00"
        className="border-border-game bg-bg-secondary font-mono"
      />
    </div>
  ),
};

export const AutoCashout: Story = {
  render: () => (
    <div className="w-60">
      <label className="mb-1 block text-sm text-text-secondary">Auto Cashout (x)</label>
      <Input
        type="number"
        min={1.01}
        step="0.1"
        placeholder="Ex: 2.00"
        className="border-border-game bg-bg-secondary font-mono"
      />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    placeholder: "Indisponível",
    disabled: true,
  },
};
