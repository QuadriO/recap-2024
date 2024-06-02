using my.bookshop as my from '../db/data-model';

@Authorization: {Type: 'basic'}
@(requires: 'authenticated-user')
service BasiccatalogService {
    @readonly
    entity Books      as projection on my.Books;

    @(requires: 'admin')
    entity AdminBooks as projection on my.Books;
}
