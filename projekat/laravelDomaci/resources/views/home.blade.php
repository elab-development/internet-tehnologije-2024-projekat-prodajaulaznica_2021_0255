@extends('layouts.app')

@section('title', 'Početna')

@section('content')
<div class="container">
    <!-- Hero Section -->
    <div class="row mb-5">
        <div class="col-12 text-center">
            <h1 class="display-4 mb-3">Dobrodošli u EventApp</h1>
            <p class="lead">Pronađite i rezervišite ulaznice za najbolje događaje u gradu!</p>
            <a href="{{ route('events.index') }}" class="btn btn-primary btn-lg">
                <i class="fas fa-search"></i> Pretražite događaje
            </a>
        </div>
    </div>

    <!-- Stats Section -->
    <div class="row mb-5">
        <div class="col-md-4 text-center">
            <div class="card bg-primary text-white">
                <div class="card-body">
                    <i class="fas fa-calendar-alt fa-3x mb-3"></i>
                    <h3>{{ $totalEvents }}</h3>
                    <p>Ukupno događaja</p>
                </div>
            </div>
        </div>
        <div class="col-md-4 text-center">
            <div class="card bg-success text-white">
                <div class="card-body">
                    <i class="fas fa-tags fa-3x mb-3"></i>
                    <h3>{{ $totalCategories }}</h3>
                    <p>Kategorija</p>
                </div>
            </div>
        </div>
        <div class="col-md-4 text-center">
            <div class="card bg-info text-white">
                <div class="card-body">
                    <i class="fas fa-ticket-alt fa-3x mb-3"></i>
                    <h3>{{ $totalTickets }}</h3>
                    <p>Prodanih ulaznica</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Upcoming Events -->
    <div class="row">
        <div class="col-12">
            <h2 class="mb-4">Nadolazeći događaji</h2>
        </div>
        @foreach($upcomingEvents as $event)
            <div class="col-md-4 mb-4">
                <div class="card event-card">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-2">
                            <span class="category-color me-2" style="background-color: {{ $event->category->color }}"></span>
                            <small class="text-muted">{{ $event->category->name }}</small>
                        </div>
                        <h5 class="card-title">{{ $event->name }}</h5>
                        <p class="card-text">{{ Str::limit($event->description, 80) }}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">{{ $event->start_date->format('d.m.Y H:i') }}</small>
                            <a href="" class="btn btn-outline-primary btn-sm">Detalji</a>
                        </div>
                    </div>
                </div>
            </div>
        @endforeach
    </div>
</div>
@endsection
