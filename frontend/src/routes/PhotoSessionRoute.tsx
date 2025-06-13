import { AppLayoutToolbar, BreadcrumbGroup } from '@cloudscape-design/components';
import { PhotoSessionBooking } from '../components/PhotoSession';

export function PhotoSessionRoute() {
  return (
    <AppLayoutToolbar
      navigationHide={true}
      toolsHide={true}
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: 'Inicio', href: '/' },
            { text: 'Sesiones de Fotos', href: '/photo-sessions' },
          ]}
        />
      }
      content={<PhotoSessionBooking />}
    />
  );
}

export default PhotoSessionRoute;