import { useState, useMemo } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  AppLayoutToolbar,
  BreadcrumbGroup,
  Button,
  Container,
  ContentLayout,
  Flashbar,
  Header,
  KeyValuePairs,
  Link,
  SpaceBetween,
  Spinner,
  Table,
  TextFilter,
  Pagination,
  CollectionPreferences,
  StatusIndicator,
  Box,
  ColumnLayout,
} from '@cloudscape-design/components';
import { useNavigate } from 'react-router';

const GET_SPONSOR_DASHBOARD = gql`
  query getSponsorDashboard {
    getSponsorDashboard {
      visits {
        user_id
        name
        company
        job_title
        email
        cell_phone
        short_id
        message
        last_visit
      }
      sponsor_name
      total_visits
    }
  }
`;

interface SponsorUser {
  user_id: string;
  name: string;
  company?: string;
  job_title?: string;
  email?: string;
  cell_phone?: string;
  short_id?: string;
  message?: string;
  last_visit?: string;
}

interface SponsorDashboard {
  sponsor_name: string;
  total_visits: number;
  visits: SponsorUser[];
}

export function SponsorDashboardRoute() {
  const { data, loading, error, refetch } = useQuery(GET_SPONSOR_DASHBOARD, {
    fetchPolicy: 'cache-and-network',
  });
  const navigate = useNavigate();

  // Table state
  const [selectedItems, setSelectedItems] = useState<SponsorUser[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filteringText, setFilteringText] = useState('');
  const [sortingColumn, setSortingColumn] = useState<any>({ sortingField: 'last_visit' });
  const [sortingDescending, setSortingDescending] = useState(true);

  // Table preferences
  const [preferences, setPreferences] = useState({
    pageSize: 10,
    visibleContent: ['name', 'company', 'job_title', 'last_visit', 'message'],
    wrapLines: false,
  });

  // Filter and sort data
  const filteredItems = useMemo(() => {
    if (!data?.getSponsorDashboard?.visits) return [];

    let items = [...data.getSponsorDashboard.visits];

    // Apply text filter
    if (filteringText) {
      const filterText = filteringText.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(filterText) ||
          item.company?.toLowerCase().includes(filterText) ||
          item.job_title?.toLowerCase().includes(filterText) ||
          item.email?.toLowerCase().includes(filterText)
      );
    }

    // Apply sorting
    if (sortingColumn.sortingField) {
      items.sort((a, b) => {
        const aVal = a[sortingColumn.sortingField as keyof SponsorUser] || '';
        const bVal = b[sortingColumn.sortingField as keyof SponsorUser] || '';

        if (sortingColumn.sortingField === 'last_visit') {
          const aDate = new Date(aVal).getTime();
          const bDate = new Date(bVal).getTime();
          return sortingDescending ? bDate - aDate : aDate - bDate;
        }

        return sortingDescending
          ? bVal.toString().localeCompare(aVal.toString())
          : aVal.toString().localeCompare(bVal.toString());
      });
    }

    return items;
  }, [data, filteringText, sortingColumn, sortingDescending]);

  // Pagination
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPageIndex - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPageIndex, pageSize]);

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Time since helper
  const getTimeSince = (dateString?: string) => {
    if (!dateString) return null;
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  };

  // Table columns definition
  const columnDefinitions = [
    {
      id: 'name',
      header: 'Nombre',
      cell: (item: SponsorUser) => (
        <Link href={`/profile/${item.short_id}`} fontSize="body-m">
          {item.name}
        </Link>
      ),
      sortingField: 'name',
      isRowHeader: true,
    },
    {
      id: 'company',
      header: 'Empresa',
      cell: (item: SponsorUser) => item.company || '-',
      sortingField: 'company',
    },
    {
      id: 'job_title',
      header: 'Puesto',
      cell: (item: SponsorUser) => item.job_title || '-',
      sortingField: 'job_title',
    },
    {
      id: 'last_visit',
      header: 'Última visita',
      cell: (item: SponsorUser) => {
        const timeSince = getTimeSince(item.last_visit);
        return (
          <Box>
            <div>{formatDate(item.last_visit)}</div>
            {timeSince && (
              <Box fontSize="body-s" color="text-status-inactive">
                {timeSince}
              </Box>
            )}
          </Box>
        );
      },
      sortingField: 'last_visit',
    },
    {
      id: 'message',
      header: 'Notas',
      cell: (item: SponsorUser) => {
        if (!item.message) return '-';
        const truncated =
          item.message.length > 50 ? item.message.substring(0, 50) + '...' : item.message;
        return <span title={item.message}>{truncated}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: (item: SponsorUser) => (
        <Button variant="inline-link" onClick={() => navigate(`/profile/${item.short_id}`)}>
          Ver perfil
        </Button>
      ),
    },
  ];

  const dashboardData: SponsorDashboard | null = data?.getSponsorDashboard || null;

  return (
    <AppLayoutToolbar
      navigationHide={true}
      toolsHide={true}
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: 'Inicio', href: '/' },
            { text: 'Panel de Patrocinadores', href: '/sponsor-dashboard' },
          ]}
        />
      }
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header
                variant="h1"
                actions={
                  <Button iconName="refresh" onClick={() => refetch()} loading={loading}>
                    Actualizar
                  </Button>
                }
              >
                Panel de Patrocinadores
              </Header>
              {loading && <Spinner size="normal" />}
            </SpaceBetween>
          }
        >
          {error ? (
            <Flashbar
              items={[
                {
                  type: 'error',
                  content: error.message || 'Error al cargar los datos del panel',
                  dismissible: false,
                },
              ]}
            />
          ) : (
            <SpaceBetween size="l">
              {/* Summary Cards */}
              {dashboardData && (
                <ColumnLayout columns={3} borders="horizontal">
                  <Container>
                    <KeyValuePairs
                      columns={1}
                      items={[
                        {
                          label: 'Patrocinador',
                          value: loading ? <Spinner /> : dashboardData.sponsor_name,
                        },
                      ]}
                    />
                  </Container>
                  <Container>
                    <KeyValuePairs
                      columns={1}
                      items={[
                        {
                          label: 'Total de visitas',
                          value: loading ? (
                            <Spinner />
                          ) : (
                            <StatusIndicator type="success">
                              {dashboardData.total_visits}
                            </StatusIndicator>
                          ),
                        },
                      ]}
                    />
                  </Container>
                  <Container>
                    <KeyValuePairs
                      columns={1}
                      items={[
                        {
                          label: 'Visitas únicas',
                          value: loading ? (
                            <Spinner />
                          ) : (
                            <StatusIndicator type="info">
                              {dashboardData.visits?.length || 0}
                            </StatusIndicator>
                          ),
                        },
                      ]}
                    />
                  </Container>
                </ColumnLayout>
              )}

              {/* Visitors Table */}
              <Container
                header={
                  <Header
                    variant="h2"
                    counter={`(${filteredItems.length})`}
                    description="Lista de asistentes que han visitado tu stand"
                  >
                    Visitantes
                  </Header>
                }
              >
                <Table
                  onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
                  selectedItems={selectedItems}
                  ariaLabels={{
                    selectionGroupLabel: 'Selección de elementos',
                    allItemsSelectionLabel: ({ selectedItems }) =>
                      `${selectedItems.length} ${
                        selectedItems.length === 1 ? 'elemento' : 'elementos'
                      } seleccionados`,
                    itemSelectionLabel: ({ selectedItems }, item) => {
                      const isItemSelected = selectedItems.filter(
                        (i) => i.user_id === item.user_id
                      ).length;
                      return `${item.name} está ${isItemSelected ? '' : 'no '}seleccionado`;
                    },
                  }}
                  columnDefinitions={columnDefinitions}
                  items={paginatedItems}
                  loadingText="Cargando visitantes..."
                  loading={loading}
                  trackBy="user_id"
                  empty={
                    <Box textAlign="center" color="inherit">
                      <b>No hay visitantes</b>
                      <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                        Aún no tienes visitantes registrados.
                      </Box>
                    </Box>
                  }
                  filter={
                    <TextFilter
                      filteringText={filteringText}
                      filteringPlaceholder="Buscar visitantes..."
                      filteringAriaLabel="Filtrar visitantes"
                      onChange={({ detail }) => {
                        setFilteringText(detail.filteringText);
                        setCurrentPageIndex(1);
                      }}
                    />
                  }
                  header={
                    <Header
                      counter={
                        selectedItems.length
                          ? `(${selectedItems.length}/${filteredItems.length})`
                          : `(${filteredItems.length})`
                      }
                      actions={
                        <SpaceBetween direction="horizontal" size="xs">
                          <Button
                            disabled={selectedItems.length !== 1}
                            onClick={() => {
                              if (selectedItems[0]) {
                                navigate(`/profile/${selectedItems[0].short_id}`);
                              }
                            }}
                          >
                            Ver perfil
                          </Button>
                        </SpaceBetween>
                      }
                    >
                      Visitantes
                    </Header>
                  }
                  pagination={
                    <Pagination
                      currentPageIndex={currentPageIndex}
                      onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
                      pagesCount={Math.ceil(filteredItems.length / pageSize)}
                      ariaLabels={{
                        nextPageLabel: 'Página siguiente',
                        previousPageLabel: 'Página anterior',
                        pageLabel: (pageNumber) => `Página ${pageNumber} de todas las páginas`,
                      }}
                    />
                  }
                  preferences={
                    <CollectionPreferences
                      title="Preferencias"
                      confirmLabel="Confirmar"
                      cancelLabel="Cancelar"
                      preferences={preferences}
                      onConfirm={({ detail }) => {
                        setPreferences({
                          pageSize: detail.pageSize || 10,
                          visibleContent: [
                            ...(detail.visibleContent || [
                              'name',
                              'company',
                              'job_title',
                              'last_visit',
                              'message',
                            ]),
                          ],
                          wrapLines: detail.wrapLines || false,
                        });
                        setPageSize(detail.pageSize || 10);
                      }}
                      pageSizePreference={{
                        title: 'Tamaño de página',
                        options: [
                          { value: 10, label: '10 visitantes' },
                          { value: 20, label: '20 visitantes' },
                          { value: 50, label: '50 visitantes' },
                        ],
                      }}
                      wrapLinesPreference={{
                        label: 'Ajustar líneas',
                        description: 'Selecciona para ver todo el texto y ajustar las líneas',
                      }}
                      visibleContentPreference={{
                        title: 'Seleccionar columnas visibles',
                        options: [
                          {
                            label: 'Propiedades principales',
                            options: [
                              { id: 'name', label: 'Nombre', editable: false },
                              { id: 'company', label: 'Empresa' },
                              { id: 'job_title', label: 'Puesto' },
                              { id: 'last_visit', label: 'Última visita' },
                              { id: 'message', label: 'Notas' },
                            ],
                          },
                        ],
                      }}
                    />
                  }
                  sortingColumn={sortingColumn}
                  sortingDescending={sortingDescending}
                  onSortingChange={({ detail }) => {
                    setSortingColumn(detail.sortingColumn);
                    setSortingDescending(detail.isDescending || false);
                  }}
                />
              </Container>
            </SpaceBetween>
          )}
        </ContentLayout>
      }
    />
  );
}
