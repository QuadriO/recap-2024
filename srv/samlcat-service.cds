using my.bookshop as my from '../db/data-model';

@Authorization: {
    Type     : 'saml',
    LoginPath: '/saml'
}
@(requires: 'authenticated-user')
service SamlcatalogService {
    @readonly
    entity Books      as projection on my.Books;

    @(requires: 'admin')
    entity AdminBooks as projection on my.Books;
}
