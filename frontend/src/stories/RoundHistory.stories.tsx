import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RoundHistory } from "@/components/round-history";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const meta: Meta<typeof RoundHistory> = {
  title: "Game/RoundHistory",
  component: RoundHistory,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="w-full max-w-4xl bg-bg-primary p-4">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RoundHistory>;

export const Default: Story = {};
