import { MemoryRouter as Router } from 'react-router';
import type { Meta, StoryObj } from '@storybook/react';

import { UserProfile } from './UserProfile';

const template = (args: React.ComponentProps<typeof UserProfile>) => (
  <Router>
    <UserProfile {...args} />
  </Router>
);

const meta = {
  component: template,
  title: 'Components/UserProfile',
} satisfies Meta<typeof UserProfile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    initialId: '1',
    loading: true,
    error: null,
    user: null,
  },
};

export const WithError: Story = {
  args: {
    initialId: '1',
    loading: false,
    error: new Error('Failed to load user profile'),
    user: null,
  },
};

export const WithData: Story = {
  args: {
    initialId: '1',
    loading: false,
    error: null,
    user: {
      user_id: 'user123',
      short_id: '1',
      first_name: 'John',
      last_name: 'Doe',
      company: 'AWS',
      role: 'Solutions Architect',
    },
  },
};
