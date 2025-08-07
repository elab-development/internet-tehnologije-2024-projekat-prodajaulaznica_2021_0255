<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Potvrda otkazivanja karte</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: white;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
        }
        .ticket-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .refund-info {
            background: #d4edda;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #c3e6cb;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 10px 10px;
            font-size: 14px;
            color: #666;
        }
        .price {
            font-size: 20px;
            font-weight: bold;
            color: #28a745;
        }
        .ticket-number {
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            background: #e9ecef;
            padding: 10px;
            border-radius: 4px;
            letter-spacing: 2px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎫 TicketMaster Pro</h1>
        <h2>Potvrda otkazivanja karte</h2>
    </div>


    <div class="content">
        <p>Poštovani/a {{ $user->name }},</p>
        
        <p>Vaš zahtev za otkazivanje karte je uspešno obrađen.</p>


        <div class="ticket-info">
            <h3>📋 Otkazana karta</h3>
            <p><strong>Broj karte:</strong></p>
            <div class="ticket-number">{{ $ticket->ticket_number }}</div>
            
            <p><strong>Događaj:</strong> {{ $event->name }}</p>
            <p><strong>Datum događaja:</strong> {{ $event->start_date->format('d.m.Y H:i') }}</p>
            <p><strong>Lokacija:</strong> {{ $event->location }}</p>
            <p><strong>Datum otkazivanja:</strong> {{ $ticket->cancelled_at->format('d.m.Y H:i') }}</p>
            
            @if($ticket->cancellation_reason)
                <p><strong>Razlog otkazivanja:</strong> {{ $ticket->cancellation_reason }}</p>
            @endif
        </div>


        @if(!empty($refundInfo))
        <div class="refund-info">
            <h3>💰 Informacije o povraćaju sredstava</h3>
            <p><strong>Originalna cena karte:</strong> {{ number_format($refundInfo['original_price'] ?? $ticket->price, 0, ',', '.') }} RSD</p>
            
            @if(isset($refundInfo['cancellation_fee']) && $refundInfo['cancellation_fee'] > 0)
                <p><strong>Naknada za otkazivanje:</strong> {{ number_format($refundInfo['cancellation_fee'], 0, ',', '.') }} RSD</p>
            @endif
            
            <p><strong>Iznos povraćaja:</strong> <span class="price">{{ number_format($refundInfo['refund_amount'] ?? $ticket->refund_amount, 0, ',', '.') }} RSD</span></p>
            
            <p><strong>Vreme obrade:</strong> 5-7 radnih dana</p>
            <p><em>Sredstva će biti vraćena na isti način plaćanja koji ste koristili za kupovinu.</em></p>
        </div>
        @endif


        <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>ℹ️ Dodatne informacije:</h4>
            <ul>
                <li>Karta je trajno otkazana i ne može se ponovo aktivirati</li>
                <li>Ako imate pitanja, kontaktirajte našu podršku</li>
                <li>Povraćaj sredstava će biti obrađen u roku od 5-7 radnih dana</li>
            </ul>
        </div>
    </div>


    <div class="footer">
        <p><strong>TicketMaster Pro</strong></p>
        <p>Knez Mihailova 42, Beograd | +381 11 123 4567</p>
        <p>podrska@ticketmaster.rs | www.ticketmaster.rs</p>
        <p style="margin-top: 20px; font-size: 12px;">
            Ovaj email je automatski generisan. Molimo ne odgovarajte na njega.
        </p>
    </div>
</body>
</html>
