import {
  Box,
  Container,
  Header,
  Popover,
  SpaceBetween,
  StatusIndicator,
} from '@cloudscape-design/components';

interface SponsorLogosProps {
  visitedSponsorIds: string[];
}

export function SponsorLogos({ visitedSponsorIds }: SponsorLogosProps) {
  // Using the actual sponsor ID and image
  const sponsors = [
    {
      id: '25449556-a04f-440d-9ecb-51682b339567',
      name: 'Caylent',
      logo: '25449556-a04f-440d-9ecb-51682b339567.png',
    },
    {
      id: 'b6a1feec-9e10-4f75-8266-517f8690d22f',
      name: 'DoiT',
      logo: 'b6a1feec-9e10-4f75-8266-517f8690d22f.png',
    },
    {
      id: '00e3562a-f1db-40e7-a749-b7beb424e895',
      name: 'Capital One',
      logo: '00e3562a-f1db-40e7-a749-b7beb424e895.png',
    },
    {
      id: 'ef2774df-4614-4082-9e6a-9ba5389f4d41',
      name: 'Astra Zeneca',
      logo: 'ef2774df-4614-4082-9e6a-9ba5389f4d41.PNG',
    },
    {
      id: '5772e99c-c0ca-48a0-9ed9-3eb59d80f92e',
      name: 'IBM',
      logo: '5772e99c-c0ca-48a0-9ed9-3eb59d80f92e.gif',
    },
    {
      id: '80f1f3a0-0ab5-4c5f-98be-09211b07b193',
      name: 'Collectors',
      logo: '80f1f3a0-0ab5-4c5f-98be-09211b07b193.png',
    },
    {
      id: '7d1564cf-4158-4aa0-8d6c-b12460aa4767',
      name: 'Nu',
      logo: '7d1564cf-4158-4aa0-8d6c-b12460aa4767.png',
    },
    {
      id: '0ff4049b-a7c0-4a0e-ac6b-de7b6790942e',
      name: 'EPAM',
      logo: '0ff4049b-a7c0-4a0e-ac6b-de7b6790942e.png',
    },
    {
      id: 'fb1e781d-f35f-4435-968f-ed7f1a16eac1',
      name: 'SoftServe',
      logo: 'fb1e781d-f35f-4435-968f-ed7f1a16eac1.png',
    },
  ];

  return (
    <Container
      header={
        <Header variant="h2">
          Pasaporte{' '}
          <Box color="text-status-info" display="inline">
            <Popover
              header="Pasaporte"
              size="medium"
              triggerType="text"
              content="Visita los stands de nuestros patrocinadores, completa tu pasaporte y participa en la rifa de grandes regalos al final del día."
              renderWithPortal={true}
            >
              <Box color="text-status-info" fontSize="body-s" fontWeight="bold">
                Info
              </Box>
            </Popover>
          </Box>
        </Header>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {sponsors.map((sponsor) => {
          const isVisited = visitedSponsorIds.includes(sponsor.id);
          return (
            <div
              key={sponsor.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                backgroundColor: isVisited
                  ? 'var(--color-background-success)'
                  : 'var(--color-background-container)',
                border: `1px solid var(--color-border-${isVisited ? 'success' : 'neutral'})`,
                borderRadius: '8px',
                minWidth: 0,
              }}
            >
              <img
                src={`/sponsor-logos/${sponsor.logo}`}
                alt={`${sponsor.name} logo`}
                style={{
                  width: '56px',
                  height: '56px',
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Box fontSize="heading-m">{sponsor.name}</Box>
                <StatusIndicator type={isVisited ? 'success' : 'pending'}>
                  {isVisited ? 'Visitado' : 'Pendiente'}
                </StatusIndicator>
              </div>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
