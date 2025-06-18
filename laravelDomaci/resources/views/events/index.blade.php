@extends('layouts.app')

@section('title', 'Događaji')

@section('content')
<div class="container">
    <div class="row">
        <div class="col-12">
            <h1 class="mb-4">
                <i class="fas fa-calendar-alt"></i> Svi Događaji
                <small class="text-muted">({{ $events->total() }} ukupno)</small>
            </h1>
        </div>
    </div>

    <!-- Filter Section -->
    <div class="filter-section">
        <form method="GET" action="{{ route('events.index') }}">
            <div class="row g-3">
                <div class="col-md-3">
                    <label class="form-label">Pretraga</label>
                    <input type="text" name="search" class="form-control" 
                           value="{{ request('search') }}" placeholder="Pretražite događaje...">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Kategorija</label>
                    <select name="category" class="form-select">
                        <option value="">Sve kategorije</option>
                        @foreach($categories as $category)
                            <option value="{{ $category->id }}" 
                                    {{ request('category') == $category->id ? 'selected' : '' }}>
                                {{ $category->name }}
                            </option>
                        @endforeach
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Sortiranje</label>
                    <select name="sort" class="form-select">
                        <option value="start_date" {{ request('sort') == 'start_date' ? 'selected' : '' }}>Datum</option>
                        <option value="name" {{ request('sort') == 'name' ? 'selected' : '' }}>Ime</option>
                        <option value="price" {{ request('sort') == 'price' ? 'selected' : '' }}>Cena</option>
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Smer</label>
                    <select name="direction" class="form-select">
                        <option value="asc" {{ request('direction') == 'asc' ? 'selected' : '' }}>Rastući</option>
                        <option value="desc" {{ request('direction') == 'desc' ? 'selected' : '' }}>Opadajući</option>
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label">&nbsp;</label>
                    <div class="d-grid">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-search"></i> Filtriraj
                        </button>
                    </div>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-md-3">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="available" value="1" 
                               {{ request('available') ? 'checked' : '' }}>
                        <label class="form-check-label">Samo dostupni</label>
                    </div>
                </div>
                <div class="col-md-9 text-end">
                    <a href="{{ route('events.index') }}" class="btn btn-outline-secondary btn-sm">
                        <i class="fas fa-times"></i> Obriši filtere
                    </a>
                </div>
            </div>
        </form>
    </div>

    <!-- Events Grid -->
    <div class="row">
        @forelse($events as $event)
            <div class="col-md-4 mb-4">
                <div class="card event-card h-100">
                    @if($event->thumbnail_url)
                        <img src="https://www.crucial.com.au/blog/wp-content/uploads/2014/12/events_medium.jpg" class="card-img-top" style="height: 200px; object-fit: cover;" alt="{{ $event->name }}">
                    @else
                        <div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                            <i class="fas fa-image fa-3x text-muted"></i>
                        </div>
                    @endif
                    
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex align-items-center mb-2">
                            <span class="category-color me-2" style="background-color: {{ $event->category->color }}"></span>
                            <small class="text-muted">{{ $event->category->name }}</small>
                        </div>
                        
                        <h5 class="card-title">{{ $event->name }}</h5>
                        <p class="card-text flex-grow-1">{{ Str::limit($event->description, 100) }}</p>
                        
                        <div class="mt-auto">
                            <div class="row mb-2">
                                <div class="col-6">
                                    <small class="text-muted">
                                        <i class="fas fa-calendar"></i> 
                                        {{ $event->start_date->format('d.m.Y') }}
                                    </small>
                                </div>
                                <div class="col-6 text-end">
                                    <small class="text-muted">
                                        <i class="fas fa-clock"></i> 
                                        {{ $event->start_date->format('H:i') }}
                                    </small>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-6">
                                    <small class="text-muted">
                                        <i class="fas fa-map-marker-alt"></i> 
                                        {{ Str::limit($event->location, 20) }}
                                    </small>
                                </div>
                                <div class="col-6 text-end">
                                    <span class="badge bg-{{ $event->available_tickets > 0 ? 'success' : 'danger' }}">
                                        {{ $event->available_tickets }} dostupno
                                    </span>
                                </div>
                            </div>
                            
                            <div class="d-flex justify-content-between align-items-center">
                                <strong class="text-primary">{{ number_format($event->price, 0, ',', '.') }} RSD</strong>
                                <a href="{{ route('events.show', $event->id) }}" class="btn btn-outline-primary btn-sm">
                                    Detalji <i class="fas fa-arrow-right"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        @empty
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle"></i> Nema događaja koji odgovaraju vašim kriterijumima.
                </div>
            </div>
        @endforelse
    </div>

    <!-- Pagination -->
    <div class="d-flex justify-content-center" height="24">
        {{ $events->links('pagination::bootstrap-5') }}
    </div>
</div>
@endsection
