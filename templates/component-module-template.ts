import * as angular from 'angular';

export const <%=camelName%>Module = angular.module(
    '<%=appPrefix%>....<%=camelName%>',
    [
        <%=dependsOnModules%>
    ]
);

<%=camelName%>Module.component(<%=camelNameFirstUpper%>Component.name, <%=camelNameFirstUpper%>Component);
