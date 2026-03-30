import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Leaderboard } from "@/components/leaderboard";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const meta: Meta<typeof Leaderboard> = {
  title: "Game/Leaderboard",
  component: Leaderboard,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="w-80 bg-bg-primary p-4">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Leaderboard>;

export const Default: Story = {};
