import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/components/ui/badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { children: "RUNNING" },
};

export const CrashLow: Story = {
  render: () => <Badge className="bg-red-500/20 text-red-400">1.23x</Badge>,
};

export const CrashHigh: Story = {
  render: () => <Badge className="bg-green-500/20 text-green-400">15.47x</Badge>,
};

export const Status: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="default">BETTING</Badge>
      <Badge className="bg-neon/20 text-neon">RUNNING</Badge>
      <Badge variant="destructive">CRASHED</Badge>
    </div>
  ),
};
