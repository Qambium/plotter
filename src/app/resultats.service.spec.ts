import { TestBed } from '@angular/core/testing';

import { ResultatsService } from './resultats.service';

describe('ResultatsService', () => {
  let service: ResultatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResultatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
