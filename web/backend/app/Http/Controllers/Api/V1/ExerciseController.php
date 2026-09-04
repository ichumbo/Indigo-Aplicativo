<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ExerciseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $trainer = $request->user();

        // Retorna exercícios do sistema (trainer_id IS NULL) + exercícios customizados do próprio treinador
        $query = Exercise::where(function ($q) use ($trainer) {
            $q->whereNull('trainer_id')
              ->orWhere('trainer_id', $trainer->id)
              ->orWhere('is_system', true);
        });

        if ($category = $request->query('category')) {
            if ($category !== 'Todos') {
                $query->where('category', $category);
            }
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $exercises = $query->orderBy('name', 'asc')->get();

        return response()->json([
            'exercises' => $exercises,
            'total' => $exercises->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $trainer = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|min:3|max:100',
            'category' => 'required|string',
            'muscleGroups' => 'required|array|min:1',
            'tags' => 'nullable|array',
            'thumbnailUrl' => 'nullable|url',
            'videoUrl' => 'nullable|url',
            'description' => 'nullable|string',
            'instructions' => 'nullable|string',
            'commonErrors' => 'nullable|array',
        ]);

        $exercise = Exercise::create([
            'id' => 'cust-ex-' . Str::random(10),
            'trainer_id' => $trainer->id,
            'name' => $validated['name'],
            'category' => $validated['category'],
            'muscle_groups' => $validated['muscleGroups'],
            'tags' => $validated['tags'] ?? [],
            'thumbnail_url' => $validated['thumbnailUrl'] ?? null,
            'video_url' => $validated['videoUrl'] ?? null,
            'description' => $validated['description'] ?? null,
            'instructions' => $validated['instructions'] ?? null,
            'common_errors' => $validated['commonErrors'] ?? [],
            'is_system' => false,
        ]);

        return response()->json([
            'message' => 'Exercício personalizado cadastrado com sucesso!',
            'exercise' => $exercise,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();

        $exercise = Exercise::find($id);

        if (! $exercise) {
            return response()->json(['message' => 'Exercício não encontrado.'], 404);
        }

        if ($exercise->is_system || $exercise->trainer_id !== $trainer->id) {
            return response()->json(['message' => 'Você não tem permissão para editar este exercício.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string',
            'category' => 'sometimes|string',
            'muscleGroups' => 'sometimes|array',
            'tags' => 'nullable|array',
            'thumbnailUrl' => 'nullable|url',
            'videoUrl' => 'nullable|url',
            'description' => 'nullable|string',
            'instructions' => 'nullable|string',
        ]);

        if (isset($validated['name'])) $exercise->name = $validated['name'];
        if (isset($validated['category'])) $exercise->category = $validated['category'];
        if (isset($validated['muscleGroups'])) $exercise->muscle_groups = $validated['muscleGroups'];
        if (isset($validated['tags'])) $exercise->tags = $validated['tags'];
        if (isset($validated['thumbnailUrl'])) $exercise->thumbnail_url = $validated['thumbnailUrl'];
        if (isset($validated['videoUrl'])) $exercise->video_url = $validated['videoUrl'];
        if (isset($validated['description'])) $exercise->description = $validated['description'];
        if (isset($validated['instructions'])) $exercise->instructions = $validated['instructions'];

        $exercise->save();

        return response()->json([
            'message' => 'Exercício atualizado com sucesso.',
            'exercise' => $exercise,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();

        $exercise = Exercise::find($id);

        if (! $exercise || $exercise->trainer_id !== $trainer->id) {
            return response()->json(['message' => 'Exercício não encontrado ou não permitido.'], 403);
        }

        $exercise->delete();

        return response()->json(['message' => 'Exercício excluído com sucesso.']);
    }
}
