import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "secondary", "ghost", "destructive", "link"],
    },
    size: {
      control: "select",
      options: ["default", "xs", "sm", "lg", "icon"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: "Apostar", variant: "default" },
};

export const Outline: Story = {
  args: { children: "Cancelar", variant: "outline" },
};

export const Destructive: Story = {
  args: { children: "Parar Auto Bet", variant: "destructive" },
};

export const Ghost: Story = {
  args: { children: "Sair", variant: "ghost" },
};

export const NeonCashout: Story = {
  render: () => (
    <Button className="bg-neon text-bg-primary hover:bg-neon-hover">Cash Out — R$ 20,00</Button>
  ),
};

export const Disabled: Story = {
  args: { children: "Aguardando...", disabled: true },
};
