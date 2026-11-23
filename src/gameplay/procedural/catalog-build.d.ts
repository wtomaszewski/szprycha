declare module 'virtual:procedural-routes' {
  const routes: Record<
    import('../../content/missions').MissionCity,
    import('./RouteCatalog').RouteCatalogData
  >;
  export default routes;
}
